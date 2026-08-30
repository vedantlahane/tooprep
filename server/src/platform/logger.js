const levelPriority = { debug: 10, info: 20, warn: 30, error: 40 };
const configuredLevel = process.env.LOG_LEVEL?.toLowerCase();
const minimumLevel = levelPriority[configuredLevel] ? configuredLevel : 'info';

function write(level, event, fields = {}) {
  if (levelPriority[level] < levelPriority[minimumLevel]) return;

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...fields
  };

  // Structured logs make request/job failures queryable on every host without
  // introducing a logging vendor. Never pass tokens, passwords, or raw bodies.
  const output = JSON.stringify(entry);
  if (level === 'error') console.error(output);
  else if (level === 'warn') console.warn(output);
  else console.log(output);
}

export const logger = {
  debug: (event, fields) => write('debug', event, fields),
  info: (event, fields) => write('info', event, fields),
  warn: (event, fields) => write('warn', event, fields),
  error: (event, fields) => write('error', event, fields)
};
