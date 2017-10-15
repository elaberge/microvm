import { Arch } from "./arch";
import { IInstruction } from "./iinstruction";
import { ILogger, Logger } from "./loggers/ilogger";
import { REIL } from "./archs/reil";

export class VM {

  constructor(private arch: Arch) {

  }

  load(program: IInstruction[]): void {
    this.arch.program = program;
  }

  iterate(logger: ILogger) {
    return new Promise((resolve) => {
      const pc = this.arch.getPCReg();
      logger.onFetch(pc);
      const instr = this.arch.curInstr() || REIL.Op.UNKN(undefined, undefined, undefined);
      logger.onDecode(instr);
      logger.beforeExecute(this.arch);
      const running = instr.exec(this.arch, logger);
      logger.afterExecute(this.arch, running);
      setImmediate(() => { resolve(running); });
    });
  }

  run(logger: ILogger = new Logger): Promise<{}> {
    const self = this;

    this.arch.init(logger);

    function loop(): Promise<{}> {
      return self.iterate(logger)
        .then((running) => {
          if (running)
            return loop();
        });
    }

    return loop();
  }
}