interface ThemeStyle {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  borderColor: string;
  headerStyle: string;
  fontFamily: string;
  emojis: [string, string];
}

export const themeStyles: Record<string, ThemeStyle> = {
  General: {
    primaryColor: '#4B5563',
    secondaryColor: '#9CA3AF',
    accentColor: '#6366F1',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    headerStyle: 'font-family: Arial, sans-serif; color: #4B5563;',
    fontFamily: 'Arial, sans-serif',
    emojis: ['⭐', '⭐']
  },
  Halloween: {
    primaryColor: '#F97316',
    secondaryColor: '#7C2D12',
    accentColor: '#581C87',
    backgroundColor: '#FFFBEB',
    borderColor: '#FED7AA',
    headerStyle: 'font-family: "Creepster", cursive; color: #F97316;',
    fontFamily: '"Creepster", cursive',
    emojis: ['🎃', '👻']
  },
  Winter: {
    primaryColor: '#0EA5E9',
    secondaryColor: '#0369A1',
    accentColor: '#1E40AF',
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
    headerStyle: 'font-family: "Nunito", sans-serif; color: #0EA5E9;',
    fontFamily: '"Nunito", sans-serif',
    emojis: ['❄️', '⛄']
  },
  Spring: {
    primaryColor: '#22C55E',
    secondaryColor: '#15803D',
    accentColor: '#CA8A04',
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    headerStyle: 'font-family: "Open Sans", sans-serif; color: #22C55E;',
    fontFamily: '"Open Sans", sans-serif',
    emojis: ['🌸', '🌺']
  }
}; 