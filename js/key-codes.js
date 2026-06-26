export const KEY_CATEGORIES = [
  {
    name: 'Letters',
    keys: [
      'A','B','C','D','E','F','G','H','I','J','K','L','M',
      'N','O','P','Q','R','S','T','U','V','W','X','Y','Z'
    ]
  },
  {
    name: 'Numbers',
    keys: ['N1','N2','N3','N4','N5','N6','N7','N8','N9','N0']
  },
  {
    name: 'Symbols',
    keys: [
      'MINUS','EQUAL','LBKT','RBKT','BSLH',
      'SEMI','SQT','GRAVE','COMMA','DOT','FSLH',
      'EXCL','AT','HASH','DLLR','PRCNT',
      'CARET','AMPS','STAR','LPAR','RPAR',
      'PLUS','UNDER','TILDE','PIPE',
      'LBRC','RBRC','LT','GT','QMARK','DQT','COLON'
    ]
  },
  {
    name: 'Modifiers',
    keys: [
      'LSHIFT','RSHIFT','LCTRL','RCTRL',
      'LALT','RALT','LGUI','RGUI'
    ]
  },
  {
    name: 'Navigation',
    keys: [
      'ENTER','ESC','BSPC','DEL','TAB','SPACE','CAPS',
      'UP','DOWN','LEFT','RIGHT',
      'HOME','END','PG_UP','PG_DN',
      'INS','PSCRN','SLCK','PAUSE_BREAK'
    ]
  },
  {
    name: 'Function',
    keys: [
      'F1','F2','F3','F4','F5','F6',
      'F7','F8','F9','F10','F11','F12',
      'F13','F14','F15','F16','F17','F18',
      'F19','F20','F21','F22','F23','F24'
    ]
  },
  {
    name: 'Keypad',
    keys: [
      'KP_N1','KP_N2','KP_N3','KP_N4','KP_N5',
      'KP_N6','KP_N7','KP_N8','KP_N9','KP_N0',
      'KP_PLUS','KP_MINUS','KP_MULTIPLY','KP_DIVIDE',
      'KP_DOT','KP_ENTER','KP_EQUAL','KP_NUM'
    ]
  },
  {
    name: 'Media',
    keys: [
      'C_VOL_UP','C_VOL_DN','C_MUTE',
      'C_PLAY_PAUSE','C_PLAY','C_PAUSE','C_STOP',
      'C_NEXT','C_PREV',
      'C_BRI_UP','C_BRI_DN',
      'C_RW','C_FF',
      'K_PWR','K_SLEEP','K_LOCK'
    ]
  },
  {
    name: 'International',
    keys: [
      'LANG1','LANG2','LANG3','LANG4','LANG5',
      'INT_RO','INT_KANA','INT_YEN',
      'INT_HENKAN','INT_MUHENKAN'
    ]
  }
];

export const ALL_KEYS = KEY_CATEGORIES.flatMap(c => c.keys);

export const MACRO_ACTIONS = [
  { value: 'macro_tap', label: 'Tap', desc: 'Press and release' },
  { value: 'macro_press', label: 'Press', desc: 'Hold down' },
  { value: 'macro_release', label: 'Release', desc: 'Let go' },
  { value: 'macro_wait_time', label: 'Wait', desc: 'Delay (ms)' }
];
