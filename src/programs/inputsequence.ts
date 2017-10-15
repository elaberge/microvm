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

  const unsigned char SEQUENCE[] = {
    J_UP,   J_UP,    J_DOWN, J_DOWN, J_LEFT,  J_RIGHT,
    J_LEFT, J_RIGHT, J_B,    J_A,    J_START,
  };

  unsigned char sequence;

  int main() {
    unsigned char lastDown = 0;

    sequence = 0;
    gprintf("Enter Konami Code");

    while (1) {
      unsigned char keys = joypad();
      unsigned char down = (keys != 0);

      if (down && (lastDown == 0)) {
        if (keys == SEQUENCE[sequence]) {
          sequence++;
        } else if (keys != 0) {
          sequence = 0;
        }

        if (sequence == 11) {
          target = 1;
        }
      }

      gotogxy(0, 2);
      gprintf("%d/11", sequence);

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

export const InputSequence: IProgram = function () {
  let addr = 0;
  const TargetAddr = NumberOp(addr++);
  const SequenceAddr = NumberOp(addr++);
  const SequenceStrAddr = NumberOp(addr++);
  const FormatStrAddr = NumberOp(addr++);
  const EndStrAddr = NumberOp(addr++);
  const SeqDefStartAddr = NumberOp(addr++);

  const memory = [0, 0, 100 /*"Enter Konami Code"*/, 200 /*"%d/11"*/, 999 /*"END"*/,
    JoyCodes.UP, JoyCodes.UP, JoyCodes.DOWN, JoyCodes.DOWN,
    JoyCodes.LEFT, JoyCodes.RIGHT, JoyCodes.LEFT, JoyCodes.RIGHT,
    JoyCodes.B, JoyCodes.A, JoyCodes.START,
  ];

  return {
    addr: {
      sequenceStr: () => memory[SequenceStrAddr.get()],
      formatStr: () => memory[FormatStrAddr.get()],
      endStr: () => memory[EndStrAddr.get()],
    },

    memory: memory,

    program: (z: Z80Arch) => {
      const linker = new Z80Linker(z);

      const prog = [
        linker.label("_main"),
        Z80.ADD(z.SP, NumberOp(-2)),
        // unsigned char lastDown = 0;
        Z80.LD(z.C, NumberOp(0x00)),
        // sequence = 0;
        Z80.LD(z.HL, SequenceAddr),
        Z80.LD_To_HL(NumberOp(0x00)),
        // gprintf("Enter Konami Code");
        Z80.LD(z.HL, SequenceStrAddr),
        Z80.PUSH(z.HL),
        Z80.CALL(linker.link("_gprintf")),
        Z80.ADD(z.SP, NumberOp(1)),
        // while (1) {
        linker.label("00114$"),
        //   unsigned char keys = joypad();
        Z80.CALL(linker.link("_joypad")),
        Z80.LDHL(z.SP, NumberOp(0)),
        Z80.LD_To_HL(z.B),
        //   unsigned char down = (keys != 0);
        Z80.LD_From_HL(z.A),
        Z80.OR(z.A, z.A),
        Z80.JP_Cond(z.Z, linker.link("00118$")),
        Z80.LD(z.B, NumberOp(0x01)),
        Z80.JP(linker.link("00119$")),
        linker.label("00118$"),
        Z80.LD(z.B, NumberOp(0x00)),
        linker.label("00119$"),
        Z80.LDHL(z.SP, NumberOp(1)),
        Z80.LD_To_HL(z.B),
        //   if (down && (lastDown == 0)) {
        Z80.LD(z.A, z.B),
        Z80.OR(z.A, z.A),
        Z80.JP_Cond(z.Z, linker.link("00109$")),
        Z80.LD(z.A, z.C),
        Z80.OR(z.A, z.A),
        Z80.JP_NotCond(z.Z, linker.link("00109$")),
        //     if (keys == SEQUENCE[sequence]) {
        Z80.LD(z.A, SeqDefStartAddr),
        Z80.LD(z.HL, SequenceAddr),
        Z80.ADD_From_HL(z.A),
        Z80.LD(z.HL, z.A),
        Z80.LD_From_HL(z.C),
        Z80.LDHL(z.SP, NumberOp(0)),
        Z80.LD_From_HL(z.A),
        Z80.SUB(z.A, z.C),
        Z80.JP_NotCond(z.Z, linker.link("00144$")),
        Z80.JP(linker.link("00145$")),
        linker.label("00144$"),
        Z80.JP(linker.link("00104$")),
        linker.label("00145$"),
        //       sequence++;
        Z80.LD(z.HL, SequenceAddr),
        Z80.INC_HL(),
        Z80.JP(linker.link("00105$")),
        linker.label("00104$"),
        //     } else if (keys != 0) {
        Z80.LDHL(z.SP, NumberOp(0)),
        Z80.LD_From_HL(z.A),
        Z80.OR(z.A, z.A),
        Z80.JP_Cond(z.Z, linker.link("00105$")),
        //       sequence = 0;
        Z80.LD(z.HL, SequenceAddr),
        Z80.LD_To_HL(NumberOp(0x00)),
        linker.label("00105$"),
        //     if (sequence == 11) {
        Z80.LD(z.HL, SequenceAddr),
        Z80.LD_From_HL(z.A),
        Z80.SUB(z.A, NumberOp(0x0B)),
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
        //   gprintf("%d/11", sequence);
        Z80.LD(z.HL, SequenceAddr),
        Z80.LD_From_HL(z.C),
        Z80.PUSH(z.C),
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
        Z80.LDHL(z.SP, NumberOp(1)),
        Z80.LD_From_HL(z.C),
        //   wait_vbl_done();
        Z80.PUSH(z.C),
        Z80.CALL(linker.link("_wait_vbl_done")),
        Z80.POP(z.C),
        Z80.JP(linker.link("00114$")),
        // return 0;
        linker.label("00116$"),
        Z80.ADD(z.SP, NumberOp(2)),
        Z80.RET(),
      ];

      return linker.compile(prog);
    },
  };
}();
