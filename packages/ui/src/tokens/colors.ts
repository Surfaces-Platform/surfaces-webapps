// Active Surfaces Simple Slab color tokens.

export const colors = {
  neutral: {
    0: '#FFFFFF',
    50: '#F7F6F2',
    100: '#F7F6F2',
    200: '#DAD7CF',
    400: '#8B9096',
    600: '#555B60',
    800: '#3C4145',
    900: '#0B0D0E'
  },
  brand: {
    ink: '#0B0D0E',
    ivory: '#F7F6F2',
    nickel: '#8B9096',
    rule: '#DAD7CF'
  },
  surface: {
    0: '#FFFFFF',
    canvas: '#F7F6F2',
    raised: '#FFFFFF'
  },
  text: {
    primary: '#0B0D0E',
    muted: '#3C4145',
    subtle: '#555B60',
    inverse: '#F7F6F2'
  },
  signal: {
    proof: '#00A7C8',
    active: '#00A7C8'
  },
  contract: {
    visible: '#0B0D0E',
    review: '#555B60',
    valid: '#0B0D0E',
    invalid: '#555B60'
  },
  structure: {
    primary: '#0B0D0E',
    border: '#DAD7CF'
  }
};

export type Colors = typeof colors;
