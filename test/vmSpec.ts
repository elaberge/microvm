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
  function createArch(outFn?: (c: number, v: number) => void) {
    return new Arch({
      registers: ["A", "B"],
      output: outFn,
      nbOut: 1,
    });
  }

  function testProgram(arch: Arch) {
    return Parse(arch, `
      STR %1, , A
      STR %2, , B
      ADD A, B, A
      STR A, , OUT0
      UNKN , ,
  `);
  }

  it("runs", () => {
    let val: number;

    const arch = new Arch({
      registers: ["A", "B"],
      output: (ch, x) => { val = x; },
      nbOut: 1,
    });

    const vm = new VM(arch);

    const program = testProgram(arch);

    vm.load(program);

    return vm.run()
      .then(() => {
        expect(val).equals(3);
      });
  });

  it("logs", () => {
    const arch = new Arch({
      registers: ["A", "B"],
      nbOut: 1,
    });

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
          "STR %1, , A",
          "STR %2, , B",
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
    const arch = new Arch({
      registers: ["A", "B"],
      nbOut: 1,
    });
    const vm = new VM(arch);

    const program = testProgram(arch);

    vm.load(program);

    const logger = new Logger();
    const depLogger = new DependencyLog(arch);
    logger.join(depLogger.key, depLogger);
    return vm.run(logger)
      .then(() => {
        const expected = [
          "A_0 <= add(%1, %2)",
          "OUT0_0 <= copy(A_0)",
        ];

        const serializer = new StringDependencySerializer();
        depLogger.serialize(serializer);
        serializer.lines.forEach((msg, index) => {
          expect(msg).equals(expected[index]);
        });
      });
  });

  it("loop dependencies", () => {
    const arch = new Arch({
      registers: ["A", "B"],
    });
    const vm = new VM(arch);

    const regA = arch.getReg("A");
    const regB = arch.getReg("B");

    const program = Parse(arch, `
        STR %2, , B
        STR %-5, , A
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
        const expected = [
          "B_0 <= add(%2, %2)",
          "B_1 <= add(B_0, B_0), add(B_1, B_1)",
          "A_0 <= add(%-5, %1)",
          "A_1 <= add(A_0, %1), add(A_1, %1)",
          "PC_0 <= jcc(PC=0, A_0)",
          "PC_1 <= jcc(PC_0, A_1), jcc(PC_1, A_1)",
        ];

        const serializer = new StringDependencySerializer();
        depLogger.serialize(serializer);

        serializer.lines.forEach((msg, index) => {
          expect(msg).equals(expected[index]);
        });
      });
  });
});
