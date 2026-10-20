import { describe, expect, it } from 'vitest';
import { fillCalc } from './step-text';

describe('fillCalc — блок «Вычисление»', () => {
  it('выравнивает колонки по табуляции; последняя ячейка ширину не задаёт', () => {
    const lines = fillCalc(
      ['  Key Info\t{info}\tфлаги', '  Key Nonce\t{nonce}', '  Replay\t{replay}\tсчётчик'],
      { info: '008a', nonce: '00'.repeat(32), replay: '0000000000000001' },
    );
    expect(lines).toEqual([
      '  Key Info   008a              флаги',
      '  Key Nonce  ' + '00'.repeat(32),
      '  Replay     0000000000000001  счётчик',
    ]);
  });

  it('разворачивает многострочные значения', () => {
    expect(fillCalc(['{table}'], { table: 'a\tb\nccc\td' })).toEqual(['a    b', 'ccc  d']);
  });

  it('согласует «байт» с числом (RU, UK), не трогая EN', () => {
    expect(fillCalc(['{n} байт', '{m} байт', '{k} байт'], { n: '22', m: '121', k: '12' }, 'ru')).toEqual([
      '22 байта',
      '121 байт',
      '12 байт',
    ]);
    expect(fillCalc(['{n} байт', '{m} байтів'], { n: '24', m: '1' }, 'uk')).toEqual([
      '24 байти',
      '1 байт',
    ]);
    expect(fillCalc(['{n} bytes'], { n: '22' }, 'en')).toEqual(['22 bytes']);
  });
});
