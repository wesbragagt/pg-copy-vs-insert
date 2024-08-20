import { format } from 'date-fns'
export function formatMillisecondsToReadable(milliseconds: number) /*hh:mm:ss*/ {
  return format(new Date(milliseconds), 'HH:mm:ss')
}
