export function measureDuration(milliseconds: number) /*hh:mm:ss*/ {
  const isLessThanHours = milliseconds < 3600000;
  const isLessThanMinutes = milliseconds < 60000;

  const hours = Math.floor(milliseconds / 3600000);
  const minutes = Math.floor(milliseconds / 60000);
  const seconds = Math.floor(milliseconds / 1000);

  if (isLessThanMinutes) {
    return `${seconds} seconds`;
  } else if (isLessThanHours) {
    return `${minutes} minutes and ${seconds} seconds`;
  } else {
    return `${hours} hours, ${minutes} minutes and ${seconds} seconds`;
  }
}

export function getCurrentDir(){
  return new URL('.', import.meta.url).pathname
}
