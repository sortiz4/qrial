#!/usr/bin/env node
import qrFromImage from 'jsqr';
import fs from 'node:fs';
import path from 'node:path';
import { PNG as Png } from 'pngjs';
import { toFile as qrToFile } from 'qrcode';
import yargs from 'yargs';
import definition from '../package.json' assert { type: 'json' };

class QrCode {
  static fromJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath)).map(code => new this(code.name, code.data));
  }

  static fromPng(filePath) {
    const name = path.basename(filePath);
    const png = Png.sync.read(fs.readFileSync(filePath));
    const qr = qrFromImage(new Uint8ClampedArray(png.data), png.width, png.height);
    return new this(name, qr.data);
  }

  static tryFromJson(filePath) {
    try {
      return this.fromJson(filePath);
    } catch {
      // Return undefined
    }
  }

  static tryFromPng(filePath) {
    try {
      return this.fromPng(filePath);
    } catch {
      // Return undefined
    }
  }

  constructor(name, text) {
    this.name = name;
    this.text = text;
  }
}

function getCommandOptions() {
  const deserializeOptions = {
    alias: 'deserialize',
    boolean: true,
    default: false,
    describe: 'Deserializes a JSON schema into (PNG) QR codes',
  };

  const serializeOptions = {
    alias: 'serialize',
    boolean: true,
    default: false,
    describe: 'Serializes (PNG) QR codes into a JSON schema',
  };

  const outputOptions = {
    alias: 'output',
    string: true,
    default: '',
    describe: 'Where file(s) produced by this tool should be saved',
  };

  return (
    yargs(process.argv.slice(2))
      .usage('Usage: $0 [-s|-d] [-o PATH] [FILES]')
      .option('d', deserializeOptions)
      .option('s', serializeOptions)
      .option('o', outputOptions)
      .scriptName(definition.name)
      .version(definition.version)
      .help()
      .alias({ h: 'help', v: 'version' })
      .wrap(100)
      .argv
  );
}

function main() {
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
      qrToFile(path.join(output, code.name), code.text, { type: 'png', scale: 8 });
    }
  } else if (options.serialize) {
    const schema = (
      options._
        .map(filePath => QrCode.tryFromPng(filePath))
        .filter(item => item instanceof QrCode)
        .map(code => ({ name: code.name, data: code.text }))
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
