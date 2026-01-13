export const accessLevelToLabel = (level: number): string => {
  switch (level) {
    case 0:
      return "No access";
    case 5:
      return "Minimal";
    case 10:
      return "Guest";
    case 15:
      return "Planner";
    case 20:
      return "Reporter";
    case 30:
      return "Developer";
    case 40:
      return "Maintainer";
    case 50:
      return "Owner";
    default:
      return `Level ${level}`;
  }
};
