// Design system color tokens from Surfaces Design System Reference

export const colors = {
  neutral: {
    0: '#FFFFFF',
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    400: '#A3A3A3',
    600: '#525252',
    800: '#262626',
    900: '#171717'
  },
  signal: {
    active: '#3B82F6',
    warning: '#F59E0B',
    error: '#EF4444'
  },
  contract: {
    valid: '#10B981',
    invalid: '#EF4444'
  },
  structure: {
    primary: '#1A1A1A'
  }
};

export type Colors = typeof colors;

