import { assert, expect, use } from "chai";
import * as chaiAsPromised from "chai-as-promised";
use(chaiAsPromised);

import { VM } from "../src/vm";
import { Arch } from "../src/arch";
import { Logger } from "../src/loggers/ilogger";
import { TraceLog, TraceLogItem } from "../src/loggers/tracelog";
import { DependencyLog } from "../src/loggers/dependencylog";
import { StringDependencySerializer } from "../src/loggers/depserializers/string";
import { DigraphDependencySerializer } from "../src/loggers/depserializers/digraph";
import { IOperand } from "../src/operands/ioperand";
import { REIL } from "../src/archs/reil";

import Parse = REIL.Parse;

describe("VM", () => {
  function createArch(outFn?: (c: number, v: number) => void, inFn?: (c:number) => number) {
    outFn = outFn || (() => {});
    inFn = inFn || ((c) => [1, 2][c]);
    return new Arch({
      registers: ["A", "B"],
      output: outFn,
      nbOut: 1,
      nbIn: 2,
      input: inFn,
    });
  }

  function testProgram(arch: Arch) {
    return Parse(arch, `
      STR IN0, , A
      STR IN1, , B
      ADD A, B, A
      STR A, , OUT0
      UNKN , ,
  `);
  }

  it("runs", () => {
    let val: number;

    const arch = createArch((ch, x) => { val = x; });
    const vm = new VM(arch);
    const program = testProgram(arch);
    vm.load(program);

    return vm.run()
      .then(() => {
        expect(val).equals(3);
      });
  });

  it("logs", () => {
    const arch = createArch();
    const vm = new VM(arch);
    const program = testProgram(arch);
    vm.load(program);

    const traces: TraceLogItem[] = [];
    function append(item: TraceLogItem) {
      traces.push(item);
    }

    const logger = new Logger();
    const traceLog = new TraceLog(append);
    logger.join(traceLog.key, traceLog);

    return vm.run(logger)
      .then(() => {
        expect(traces.length).equals(program.length);

        const expected = [
          "STR IN0, , A",
          "STR IN1, , B",
          "ADD A, B, A",
          "STR A, , OUT0",
          "UNKN , ,",
        ];
        const expectRegs = [
          { PC: 0, A: 0, B: 0 },
          { PC: 1, A: 1, B: 0 },
          { PC: 2, A: 1, B: 2 },
          { PC: 3, A: 3, B: 2 },
          { PC: 4, A: 3, B: 2 },
          { PC: 5, A: 3, B: 2 },
        ];

        function checkReg(regs: Map<string, IOperand>, expectRegs: any) {
          Object.keys(expectRegs).forEach((k) => {
            expect(regs.get(k).get()).equals(expectRegs[k]);
          });
        }

        traces.forEach((trace, index) => {
          expect(trace.pc).equals(index);
          expect(trace.getString()).equals(expected[index]);
          expect(trace.running).equals(index != 4);
          checkReg(trace.before, expectRegs[index]);
          checkReg(trace.after, expectRegs[index + 1]);
        }
        );
      });
  });

  it("dependencies", () => {
    const arch = createArch();
    const vm = new VM(arch);
    const program = testProgram(arch);
    vm.load(program);

    const logger = new Logger();
    const depLogger = new DependencyLog(arch);
    logger.join(depLogger.key, depLogger);
    return vm.run(logger)
      .then(() => {
        const expected = new Set([
          "IN0=1 <=",
          "IN1=2 <=",
          "A=3 <= +(IN0=1, IN1=2)",
          "OUT0=0 <= copy(A=3)",
        ]);

        const serializer = new StringDependencySerializer();
        depLogger.serialize(serializer, arch.getOut(0));
        serializer.lines.forEach((msg) => {
          expect(expected.has(msg));
          expected.delete(msg);
        });
        expect(expected.size).equals(0);
      });
  });

  it("loop dependencies", () => {

    const arch = createArch(undefined, (c) => [2,-5][c]);
    const vm = new VM(arch);

    const regA = arch.getReg("A");
    const regB = arch.getReg("B");

    const program = Parse(arch, `
        STR IN0, , B
        STR IN1, , A
      loop:
        ADD B, B, B
        ADD A, %1, A
        JCC A, , :loop
        UNKN , ,
    `);

    vm.load(program);

    const logger = new Logger();
    const depLogger = new DependencyLog(arch);
    logger.join(depLogger.key, depLogger);
    return vm.run(logger)
      .then(() => {
        const expected = new Set([
          "PC=0 <=",
          "IN1=-5 <=",
          "A=-4 <= + 1(IN1=-5)",
          "PC=2 <= jcc (Y)(PC=0, A=-4)",
          "A=-3 <= + 1(A=-4)",
          "PC=2 <= jcc (Y)(PC=2, A=-3)",
          "A=-2 <= + 1(A=-3)",
          "PC=2 <= jcc (Y)(PC=2, A=-2)",
          "A=-1 <= + 1(A=-2)",
          "PC=2 <= jcc (Y)(PC=2, A=-1)",
          "A=0 <= + 1(A=-1)",
          "PC=5 <= jcc (N)(PC=2, A=0)",
        ]);

        const serializer = new StringDependencySerializer();
        depLogger.serialize(serializer, arch.getPCReg());

        serializer.lines.forEach((msg) => {
          expect(expected.has(msg));
          expected.delete(msg);
        });
        expect(expected.size).equals(0);
      });
  });
});
