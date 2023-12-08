import qrFromImage from 'jsqr';
import fs from 'node:fs';
import path from 'node:path';
import { PNG as Png } from 'pngjs';
import { toFile as qrToFile } from 'qrcode';
import yargs, { Options as YargsOptions } from 'yargs';
import metadata from '../package.json' assert { type: 'json' };

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

class QrCode {
  constructor(public name: string, public text: string) {
  }

  static fromJson(filePath: string): QrCode[] {
    return (JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Schema[]).map(code => new this(code.name, code.data));
  }

  static fromPng(filePath: string): QrCode {
    const name = path.basename(filePath);
    const png = Png.sync.read(fs.readFileSync(filePath));
    const qr = qrFromImage(new Uint8ClampedArray(png.data), png.width, png.height);
    return new this(name, qr?.data ?? '');
  }

  static tryFromJson(filePath: string): QrCode[] | void {
    try {
      return this.fromJson(filePath);
    } catch {
      // Return undefined
    }
  }

  static tryFromPng(filePath: string): QrCode | void {
    try {
      return this.fromPng(filePath);
    } catch {
      // Return undefined
    }
  }
}

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

function main(): void {
  const options = getCommandOptions();

  if (options.deserialize) {
    const codes = (
      options._
        .map(filePath => QrCode.tryFromJson(filePath))
        .filter(item => item instanceof Array)
        .flat()
    );

    // Resolve the output
    const output = options.output.length > 0 ? (
      options.output
    ) : (
      'schema'
    );

    // Make the directory
    fs.mkdirSync(output, { recursive: true });

    // Deserialize the data
    for (const code of codes) {
      qrToFile(path.join(output, code?.name ?? ''), code?.text ?? '', { type: 'png', scale: 8 });
    }
  } else if (options.serialize) {
    const schema = (
      options._
        .map(filePath => QrCode.tryFromPng(filePath))
        .filter(item => item instanceof QrCode)
        .map(code => ({ name: code?.name, data: code?.text }))
    );

    // Resolve the output
    const output = options.output.length > 0 ? (
      options.output
    ) : (
      'schema.json'
    );

    // Serialize the data
    fs.writeFileSync(output, JSON.stringify(schema));
  }
}

try {
  main();
} catch (error) {
  console.error(error);
}
