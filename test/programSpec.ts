import { assert, expect, use } from "chai";
import * as chaiAsPromised from "chai-as-promised";
use(chaiAsPromised);

import { Logger } from "../src/loggers/ilogger";
import { Programs } from "../src/programs/programs";
import { Z80Programs } from "../src/programs/z80programs";
import { Trivial } from "../src/programs/trivial";
import { AnyInput } from "../src/programs/anyinput";
import { SpecificInput } from "../src/programs/specificinput";
import { InputSequence } from "../src/programs/inputsequence";
import { RepeatInput } from "../src/programs/repeatinput";

import { VM } from "../src/vm";
import { Z80 } from "../src/archs/z80";

import { CurrentSetting } from "./settings";

type IProgram = Programs.IProgram<Z80.Z80Arch>;
import JoyCodes = Z80Programs.JoyCodes;

describe("Program", () => {
  interface IExpected {
    [channel: number]: number,
    autoSkip: boolean,
    counter?: number,
  };

  interface IKeyPress {
    key: JoyCodes,
    autoDown?: boolean,
    nbCalls?: number,
  };

  interface ITestSetup {
    only?: boolean,
    program: IProgram,
    expectedOut: IExpected[],
    keyPress: IKeyPress[],
    outFile?: string,
  }

  const trivialTestSetup: ITestSetup = {
    //only: true,
    program: Trivial,
    expectedOut: [
      {
        autoSkip: true,
        0: Trivial.addr.trivialStr()
      },
      {
        autoSkip: true,
        1: 0x0404
      },
      {
        autoSkip: true,
        0: Trivial.addr.endStr()
      },
    ],
    keyPress: [],
  };

  const anyInputTestSetup: ITestSetup = {
    //only: true,
    program: AnyInput,
    expectedOut: [
      {
        autoSkip: true,
        0: AnyInput.addr.anyInputStr()
      },
      {
        autoSkip: true,
        1: 0x0404
      },
      {
        autoSkip: true,
        0: AnyInput.addr.endStr()
      },
    ],
    keyPress: [
      { key: JoyCodes.NONE, nbCalls:3 },
      { key: JoyCodes.UP },
    ],
  };

  const specificInputTestSetup: ITestSetup = {
    //only: true,
    program: SpecificInput,
    expectedOut: [
      {
        autoSkip: true,
        0: SpecificInput.addr.pressUpStr()
      },
      {
        autoSkip: true,
        1: 0x0404
      },
      {
        autoSkip: true,
        0: SpecificInput.addr.endStr()
      },
    ],
    keyPress: [
      { key: JoyCodes.NONE },
      { key: JoyCodes.LEFT },
      { key: JoyCodes.UP },
    ],
  };

  const inputSequenceTestSetup: ITestSetup = {
    //only: true,
    program: InputSequence,
    expectedOut: [
      {
        autoSkip: true,
        0: InputSequence.addr.sequenceStr(),
      },
      {
        autoSkip: false,
        0: InputSequence.addr.formatStr(),
        1: 0x0200,
      },
      {
        autoSkip: true,
        counter: 2,
        0: InputSequence.addr.formatStr(),
        1: 0x0200,
      },
      {
        autoSkip: true,
        counter: 2,
        0: InputSequence.addr.endStr(),
        1: 0x0404,
      },
    ],
    keyPress: [
      // Junk
      { key: JoyCodes.DOWN },
      { key: JoyCodes.UP },
      { key: JoyCodes.A },
      { key: JoyCodes.START },
      // Partial
      { key: JoyCodes.UP },
      { key: JoyCodes.UP },
      { key: JoyCodes.DOWN },
      { key: JoyCodes.DOWN },
      { key: JoyCodes.LEFT },
      { key: JoyCodes.RIGHT },
      { key: JoyCodes.LEFT },
      { key: JoyCodes.RIGHT },
      // Junk
      { key: JoyCodes.START },
      // Full
      { key: JoyCodes.UP },
      { key: JoyCodes.UP },
      { key: JoyCodes.DOWN },
      { key: JoyCodes.DOWN },
      { key: JoyCodes.LEFT },
      { key: JoyCodes.RIGHT },
      { key: JoyCodes.LEFT },
      { key: JoyCodes.RIGHT },
      { key: JoyCodes.B },
      { key: JoyCodes.A },
      { key: JoyCodes.START, autoDown: false },
    ],
  };

  const repeatInputTestSetup: ITestSetup = {
    //only: true,
    program: RepeatInput,
    expectedOut: [
      {
        autoSkip: true,
        0: RepeatInput.addr.repeatStr(),
      },
      {
        autoSkip: false,
        0: RepeatInput.addr.formatStr(),
        1: 0x0200,
      },
      {
        autoSkip: true,
        counter: 2,
        0: RepeatInput.addr.formatStr(),
        1: 0x0200,
      },
      {
        autoSkip: true,
        counter: 2,
        0: RepeatInput.addr.endStr(),
        1: 0x0404,
      },
    ],
    keyPress: [
      // Junk
      { key: JoyCodes.DOWN },
      { key: JoyCodes.UP },
      { key: JoyCodes.A },
      { key: JoyCodes.START },
      // Full
      { key: JoyCodes.UP },
      { key: JoyCodes.UP },
      { key: JoyCodes.UP, autoDown: false },
    ],
  };

  const programMap = new Map<string, ITestSetup>([
    ["Trivial", trivialTestSetup],
    ["Any input", anyInputTestSetup],
    ["Specific input", specificInputTestSetup],
    ["Input sequence", inputSequenceTestSetup],
    ["Repeat input", repeatInputTestSetup],
  ]);

  function joyCodeFilter(prefix: string): (t:string)=>string {
    const joyMap = new Map<string, string>();

    [ [JoyCodes.START, 'START'],
      [JoyCodes.SELECT, 'SELECT'],
      [JoyCodes.B, 'B'],
      [JoyCodes.A, 'A'],
      [JoyCodes.DOWN, 'DOWN'],
      [JoyCodes.UP, 'UP'],
      [JoyCodes.LEFT, 'LEFT'],
      [JoyCodes.RIGHT, 'RIGHT'],
      [JoyCodes.NONE, 'NONE'],
    ].forEach((item) => {
      joyMap.set(`${prefix}${item[0]}`, `${item[1]} (${item[0]})`);
    });

    return (t) => {
      if (joyMap.has(t))
        return joyMap.get(t);
      return t;
    }
  }

  programMap.forEach((testSetup, name) => {
    describe(name, () => {
      let fn: any = it;
      if (testSetup.only)
        fn = it.only;
      fn("runs", () => {
        let keyPress = 0;
        let keyResolve: () => void;

        function onOut(channel: number, val: number) {
          const expected = testSetup.expectedOut[0];
          if (expected.counter == undefined)
            expected.counter = 1;
          expect(expected).property(channel.toString());
          expect(expected[channel]).equals(val);
          if (expected.autoSkip) {
            delete expected[channel];
            expected.counter--;
            if (expected.counter == 0)
              testSetup.expectedOut.shift();
          }
        }
        function onIn(channel: number, peek: boolean) {
          expect(channel).equals(0);
          if (!peek)
          keyResolve();
          return keyPress;
        }

        const arch = new Z80.Z80Arch({
          mem: 1000,
          nbOut: 2,
          nbIn: 1,
          memVal: testSetup.program.memory,
          output: onOut,
          input: onIn,
        });

        const vm = new VM(arch);
        const program = testSetup.program.program(arch);
        vm.load(program);

        CurrentSetting.outFile = testSetup.outFile;
        CurrentSetting.labelFilter = joyCodeFilter("IN0=");

        if (CurrentSetting.dumpProgram) {
          const instr: string[] = [];
          program.forEach((i, index) => {
            instr.push(`${index}\t${i.getString()}`);
          });
          console.log(instr.join("\n"));
        }

        const logger = new Logger();
        CurrentSetting.logger(arch, logger);

        let p = Promise.resolve();
        testSetup.keyPress.forEach((key, index) => {
          const k = key;
          if (k.autoDown == undefined)
            k.autoDown = true;
          if (k.nbCalls == undefined)
            k.nbCalls = 1;

          const i = index;
          for (let j = 0; j < k.nbCalls; ++j) {
            p = p.then(() => new Promise<void>((resolve) => {
              keyPress = k.key;
              keyResolve = resolve;
            }));
          }

          if (k.autoDown) {
            for (let j = 0; j < k.nbCalls; ++j) {
              p = p.then(() => new Promise<void>((resolve) => {
                keyPress = 0;
                keyResolve = resolve;
              }));
            }
          }

          if (i == testSetup.keyPress.length - 1) {
            p = p.then(() => { testSetup.expectedOut.shift(); });
          }
        });

        return vm.run(logger)
          .then(() => {
            expect(testSetup.expectedOut).length(0);
            CurrentSetting.postLog(arch, logger, CurrentSetting);
      });
      }).timeout(10000);
    });
  });
});
