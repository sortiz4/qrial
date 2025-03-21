import jsQr, { QRCode as QrCode } from 'jsqr';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { PNG as Png } from 'pngjs';
import { toFile as qrToFile } from 'qrcode';
import yargs, { Options as YargsOptions } from 'yargs';
import metadata from '../package.json' with { type: 'json' };

interface Schema {
  readonly name: string;
  readonly data: string;
}

interface Options {
  readonly _: string[];
  readonly output: string;
  readonly serialize: boolean;
  readonly deserialize: boolean;
}

function deserialize(files: string[], output: string): void {
  function fromJson(file: string): Schema[] {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  }

  function tryFromJson(file: string): Schema[] | undefined {
    try {
      return fromJson(file);
    } catch {
      // Return undefined
    }
  }

  function isSchemaArray(value?: Schema[]): value is Schema[] {
    return value instanceof Array;
  }

  const codes = files.map(tryFromJson).filter(isSchemaArray).flat();

  // Resolve the output
  const destination = output ? output : 'schema';

  // Make the directory
  fs.mkdirSync(destination, { recursive: true });

  // Deserialize the data
  for (const code of codes) {
    qrToFile(path.join(destination, code.name), code.data, { type: 'png', scale: 8 });
  }
}

function serialize(files: string[], output: string): void {
  function imageToQr(data: Uint8ClampedArray, width: number, height: number): QrCode {
    return (jsQr as unknown as typeof imageToQr)(data, width, height);
  }

  function fromPng(file: string): Schema {
    const png = Png.sync.read(fs.readFileSync(file));
    const qr = imageToQr(new Uint8ClampedArray(png.data), png.width, png.height);

    return {
      name: path.basename(file),
      data: qr?.data ?? '',
    };
  }

  function tryFromPng(file: string): Schema | undefined {
    try {
      return fromPng(file);
    } catch {
      // Return undefined
    }
  }

  function isSchema(value?: Schema): value is Schema {
    return !!value;
  }

  // Serialize the data
  fs.writeFileSync(output ? output : 'schema.json', JSON.stringify(files.map(tryFromPng).filter(isSchema)));
}

function main(): void {
  function getCommandOptions(): Options {
    const deserializeOptions: YargsOptions = {
      alias: 'deserialize',
      boolean: true,
      default: false,
      describe: 'Deserializes a JSON schema into (PNG) QR codes',
    };

    const serializeOptions: YargsOptions = {
      alias: 'serialize',
      boolean: true,
      default: false,
      describe: 'Serializes (PNG) QR codes into a JSON schema',
    };

    const outputOptions: YargsOptions = {
      alias: 'output',
      string: true,
      default: '',
      describe: 'Where file(s) produced by this tool should be saved',
    };

    return (
      yargs(process.argv.slice(2))
        .scriptName(metadata.name)
        .version(metadata.version)
        .help()
        .wrap(100)
        .usage('Usage: $0 [-s|-d] [-o PATH] [FILES]')
        .option('d', deserializeOptions)
        .option('s', serializeOptions)
        .option('o', outputOptions)
        .alias({ h: 'help', v: 'version' })
        .argv as unknown as Options
    );
  }

  const options = getCommandOptions();

  if (options.deserialize) {
    deserialize(options._, options.output);
  }

  if (options.serialize) {
    serialize(options._, options.output);
  }
}

if (import.meta.main) {
  try {
    main();
  } catch (error) {
    console.error(error);
  }
}
