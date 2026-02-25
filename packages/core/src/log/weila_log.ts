import { debug, Debugger } from 'debug';

//DB:*, FSM:*, AUDIO:*

/**
 * 初始化日志
 * 例子: initLogger('MOD:*, CORE:*, FSM:*, DB:*, NET:*, -socket-client:*');
 * @param modules
 */
function initLogger(modules: string): void {
  console.log('init logger:', modules);
  debug.enable(modules + ',-socket-client:*');
}

/**
 * 获取logger
 * 例子： getLogger('CORE:info'), 返回的logger可以直接用来打印信息，前缀为CORE:info
 * @param loggerName
 */
function getLogger(loggerName: string): Debugger {
  const logger = debug(loggerName);
  logger.log = console.log.bind(console);
  return logger;
}

export { initLogger, getLogger };
