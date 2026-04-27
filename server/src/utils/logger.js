export const logMission = (message) => {
  console.log(`[MISSION-CONTROL] ${message}`);
};

export const logMissionError = (message, error) => {
  console.error(`[MISSION-CONTROL][ALERT] ${message}`);
  if (error) {
    console.error(error);
  }
};
