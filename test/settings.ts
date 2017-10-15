import { Arch } from "../src/arch";
import { ILogger, Logger } from "../src/loggers/ilogger";
import { TraceLog } from "../src/loggers/tracelog";
import { OpKey as DependencyKey, DependencyLog } from "../src/loggers/dependencylog";
import { StringDependencySerializer } from "../src/loggers/depserializers/string";
import { DigraphDependencySerializer } from "../src/loggers/depserializers/digraph";

const DigraphFile: string = "/tmp/t.dot";

export interface ISettings {
  dumpProgram: boolean,
  logger: (arch: Arch, logger: ILogger) => void,
  postLog: (arch: Arch, logger: ILogger) => void,
}

const SilentSetting: ISettings = {
  dumpProgram: false,
  logger: () => { },
  postLog: () => { },
}

const DumpSetting: ISettings = {
  dumpProgram: true,
  logger: () => { },
  postLog: () => { },
}

const TraceSetting: ISettings = {
  dumpProgram: false,
  logger: (arch: Arch, logger: ILogger) => {
    const traceLog = new TraceLog((item) => {
      console.log(`${item.pc}  ${item.getString()}`);
    });
    logger.join(traceLog.key, traceLog);
  },
  postLog: () => { },
}

const StringDepSetting = function (): ISettings {
  let depLog: DependencyLog;
  return {
    dumpProgram: false,
    logger: (arch, logger) => {
      depLog = new DependencyLog(arch);
      logger.join(depLog.key, depLog);
    },
    postLog: (arch, logger) => {
      const serializer = new StringDependencySerializer();
      depLog.serialize(serializer, arch.getPCReg());
      serializer.lines.forEach((msg) => {
        console.log(msg);
      });
    },
  };
}();

const DigraphDepSetting = function (): ISettings {
  let depLog: DependencyLog;
  return {
    dumpProgram: false,
    logger: (arch, logger) => {
      depLog = new DependencyLog(arch);
      logger.join(depLog.key, depLog);
    },
    postLog: (arch, logger) => {
      const serializer = new DigraphDependencySerializer();
      depLog.serialize(serializer, arch.getPCReg());
      console.log(serializer.toString());
      if (DigraphFile)
        serializer.write(DigraphFile);
    },
  };
}();

const DebugSetting = function (): ISettings {
  let depLog: DependencyLog;

  return {
    dumpProgram: false,
    logger: (arch, logger) => {
      const traceLog = new TraceLog((item) => {
        console.log(`${item.pc}  ${item.getString()}`);
      });
      depLog = new DependencyLog(arch);
      logger.join(traceLog.key, traceLog);
      logger.join(depLog.key, depLog);
    },
    postLog: (arch, logger) => {
      const serializer = new StringDependencySerializer();
      depLog.serialize(serializer, arch.getPCReg());
      serializer.lines.forEach((msg) => {
        console.log(msg);
      });
    },
  };
}();

export const CurrentSetting: ISettings = StringDepSetting;