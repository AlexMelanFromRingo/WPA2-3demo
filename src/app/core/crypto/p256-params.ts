/**
 * Параметры кривой NIST P-256 (группа SAE 19) — для подписей в интерфейсе без
 * загрузки EC-библиотеки в основной поток. Совпадение с @noble/curves проверяет sae.spec.ts.
 */

/** p — модуль поля. */
export const P256_P = 0xffffffff00000001000000000000000000000000ffffffffffffffffffffffffn;
/** r — порядок группы точек. */
export const P256_R = 0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551n;
