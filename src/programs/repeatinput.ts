import { Z80 as Z80Module } from "../archs/z80";
import { Programs } from "./programs";
import { Z80Programs } from "./z80programs";
import { IOperand } from "../operands/ioperand";
import { NumberOp } from "../operands/constant";

import Z80 = Z80Module.Op;
import Z80Arch = Z80Module.Z80Arch;
import Z80Linker = Z80Programs.Z80Linker;
import JoyCodes = Z80Programs.JoyCodes;
export type IProgram = Programs.IProgram<Z80Arch>;

/*
  volatile char target;

  unsigned char choice;
  unsigned char count;
  unsigned char lastDown = 0;

  int main() {

    count = 0;
    gprintf("Press a button 3 times");

    while (1) {
      unsigned char keys = joypad();
      unsigned char down = (keys != 0);

      if (down && (lastDown == 0)) {
        if (keys == choice) {
          count++;
        } else if (keys != 0) {
          choice = keys;
          count = 1;
        }

        if (count == 3) {
          target = 1;
        }
      }

      gotogxy(0, 2);
      gprintf("%d/3", count);

      if (target != 0) {
        gotogxy(4, 4);
        gprintf("END");
        return 0;
      }

      lastDown = down;
      wait_vbl_done();
    }
    return 0;
  }
*/

export const RepeatInput: IProgram = function () {
  let addr = 0;
  const TargetAddr = NumberOp(addr++);
  const ChoiceAddr = NumberOp(addr++);
  const CountAddr = NumberOp(addr++);
  const LastDownAddr = NumberOp(addr++);
  const RepeatStrAddr = NumberOp(addr++);
  const FormatStrAddr = NumberOp(addr++);
  const EndStrAddr = NumberOp(addr++);

  const memory = [0, 0, 0, 0, 100 /*"Press a button 3 times"*/, 200 /*"%d/3"*/, 999 /*"END"*/];

  return {
    addr: {
      repeatStr: () => memory[RepeatStrAddr.get()],
      formatStr: () => memory[FormatStrAddr.get()],
      endStr: () => memory[EndStrAddr.get()],
    },

    memory: memory,

    program: (z: Z80Arch) => {
      const linker = new Z80Linker(z);

      const prog = [
        linker.label("_main"),
        // count = 0;
        Z80.LD(z.HL, CountAddr),
        Z80.LD_To_HL(NumberOp(0x00)),
        // gprintf("Press a button 3 times");
        Z80.LD(z.HL, RepeatStrAddr),
        Z80.PUSH(z.HL),
        Z80.CALL(linker.link("_gprintf")),
        Z80.ADD(z.SP, NumberOp(1)),
        // while (1) {
        linker.label("00114$"),
        //   unsigned char keys = joypad();
        Z80.CALL(linker.link("_joypad")),
        //   unsigned char down = (keys != 0);
        Z80.LD(z.A, z.B),
        Z80.OR(z.A, z.A),
        Z80.JP_Cond(z.Z, linker.link("00118$")),
        Z80.LD(z.A, NumberOp(0x01)),
        Z80.JP(linker.link("00119$")),
        linker.label("00118$"),
        Z80.LD(z.A, NumberOp(0x00)),
        linker.label("00119$"),
        Z80.LD(z.C, z.A),
        //   if (down && (lastDown == 0)) {
        Z80.OR(z.A, z.A),
        Z80.JP_Cond(z.Z, linker.link("00109$")),
        Z80.LD(z.HL, LastDownAddr),
        Z80.LD_From_HL(z.A),
        Z80.OR(z.A, z.A),
        Z80.JP_NotCond(z.Z, linker.link("00109$")),
        //     if (keys == choice) {
        Z80.LD(z.HL, ChoiceAddr),
        Z80.LD_From_HL(z.A),
        Z80.SUB(z.A, z.B),
        Z80.JP_NotCond(z.Z, linker.link("00144$")),
        Z80.JP(linker.link("00145$")),
        linker.label("00144$"),
        Z80.JP(linker.link("00104$")),
        linker.label("00145$"),
        //       count++;
        Z80.LD(z.HL, CountAddr),
        Z80.INC_HL(),
        Z80.JP(linker.link("00105$")),
        linker.label("00104$"),
        //     } else if (keys != 0) {
        Z80.LD(z.A, z.B),
        Z80.OR(z.A, z.A),
        Z80.JP_Cond(z.Z, linker.link("00105$")),
        //       choice = keys;
        Z80.LD(z.HL, ChoiceAddr),
        Z80.LD_To_HL(z.B),
        //       count = 1;
        Z80.LD(z.HL, CountAddr),
        Z80.LD_To_HL(NumberOp(0x01)),
        linker.label("00105$"),
        //     if (count == 3) {
        Z80.LD(z.HL, CountAddr),
        Z80.LD_From_HL(z.A),
        Z80.SUB(z.A, NumberOp(0x03)),
        Z80.JP_NotCond(z.Z, linker.link("00146$")),
        Z80.JP(linker.link("00147$")),
        linker.label("00146$"),
        Z80.JP(linker.link("00109$")),
        linker.label("00147$"),
        //       target = 1;
        Z80.LD(z.HL, TargetAddr),
        Z80.LD_To_HL(NumberOp(0x01)),
        linker.label("00109$"),
        //   gotogxy(0, 2);
        Z80.LD(z.HL, NumberOp(0x0200)),
        Z80.PUSH(z.HL),
        Z80.CALL(linker.link("_gotoxy")),
        Z80.ADD(z.SP, NumberOp(1)),
        //   gprintf("%d/3", count);
        Z80.LD(z.HL, CountAddr),
        Z80.LD_From_HL(z.B),
        Z80.PUSH(z.B),
        Z80.LD(z.HL, FormatStrAddr),
        Z80.PUSH(z.HL),
        Z80.CALL(linker.link("_gprintf")),
        Z80.ADD(z.SP, NumberOp(2)),
        //   if (target != 0) {
        Z80.LD(z.HL, TargetAddr),
        Z80.LD_From_HL(z.A),
        Z80.OR(z.A, z.A),
        Z80.JP_Cond(z.Z, linker.link("00112$")),
        //     gotogxy(4, 4);
        Z80.LD(z.HL, NumberOp(0x0404)),
        Z80.PUSH(z.HL),
        Z80.CALL(linker.link("_gotoxy")),
        Z80.ADD(z.SP, NumberOp(1)),
        //     gprintf("END");
        Z80.LD(z.HL, EndStrAddr),
        Z80.PUSH(z.HL),
        Z80.CALL(linker.link("_gprintf")),
        Z80.ADD(z.SP, NumberOp(1)),
        //     return 0;
        Z80.LD(z.DE, NumberOp(0)),
        Z80.JP(linker.link("00116$")),
        linker.label("00112$"),
        //   lastDown = down;
        Z80.LD(z.HL, LastDownAddr),
        Z80.LD_To_HL(z.C),
        //   wait_vbl_done();
        Z80.CALL(linker.link("_wait_vbl_done")),
        Z80.JP(linker.link("00114$")),
        // return 0;
        linker.label("00116$"),
        Z80.RET(),
      ];

      return linker.compile(prog);
    },
  };
}();
