import { helper } from './helper';

export function run(): void {
  console.log('主程序启动');
  const result = helper('测试数据');
  console.log(result);
}

run();
