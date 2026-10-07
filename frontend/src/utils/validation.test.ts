import { describe, expect, test } from 'vitest';
import {
  normalizeName,
  validateName,
  validateUsername,
  validateEmail,
  validatePassword,
  validateNewPassword,
} from './validation';

describe('normalizeName', () => {
  test('trims and collapses inner whitespace', () => {
    expect(normalizeName('  Nguyễn   Văn \t A ')).toBe('Nguyễn Văn A');
  });
});

describe('validateName', () => {
  test.each(['Al', 'Nguyễn Văn A', 'A'.repeat(50), '  Bo  '])('accepts %j', (v) => {
    expect(validateName(v)).toBeNull();
  });

  test.each(['', ' ', '   ', 'A', ' A ', 'A'.repeat(51)])('rejects %j', (v) => {
    expect(validateName(v)).toMatch(/2 đến 50/);
  });

  test('length is measured after collapsing whitespace', () => {
    expect(validateName('A' + ' '.repeat(60) + 'B')).toBeNull(); // "A B"
  });
});

describe('validateUsername', () => {
  test.each(['abc', 'user_name-1', 'A1_', 'a'.repeat(30), '  padded  '])('accepts %j', (v) => {
    expect(validateUsername(v)).toBeNull();
  });

  test.each(['', 'ab', 'a'.repeat(31), 'van a'])('rejects %j for length / spaces', (v) => {
    expect(validateUsername(v)).toMatch(/3 đến 30/);
  });

  test.each(['van@a', 'tên', 'a.b.c', 'a/b', 'user!'])('rejects %j for characters', (v) => {
    expect(validateUsername(v)).toMatch(/chữ cái, chữ số/);
  });
});

describe('validateEmail', () => {
  test.each(['user@example.com', 'a.b+c@sub.example.co', '  padded@example.com  '])('accepts %j', (v) => {
    expect(validateEmail(v)).toBeNull();
  });

  test.each([
    '', 'plain', 'no-at.example.com', '@example.com', 'user@', 'user@example', 'us er@example.com', 'a@b@c.com',
    `${'a'.repeat(95)}@x.com`,
  ])('rejects %j', (v) => {
    expect(validateEmail(v)).toMatch(/Email/);
  });
});

describe('validatePassword', () => {
  test.each(['12345678', 'a'.repeat(100), 'pass word with spaces inside', 'Mật khẩu 123'])('accepts %j', (v) => {
    expect(validatePassword(v)).toBeNull();
  });

  test('empty -> asks for one', () => {
    expect(validatePassword('')).toMatch(/nhập mật khẩu/);
  });

  test.each([' password1', 'password1 ', '\tpassword1'])('rejects surrounding whitespace: %j', (v) => {
    expect(validatePassword(v)).toMatch(/khoảng trắng/);
  });

  test.each(['1234567', 'short', 'a'.repeat(101)])('rejects bad length: %j', (v) => {
    expect(validatePassword(v)).toMatch(/8 đến 100/);
  });
});

describe('validateNewPassword', () => {
  test('ok when valid and confirmation matches', () => {
    expect(validateNewPassword('password123', 'password123')).toBeNull();
  });

  test('a mismatch is reported', () => {
    expect(validateNewPassword('password123', 'password124')).toMatch(/không khớp/);
  });

  test('rule errors come before the mismatch error', () => {
    expect(validateNewPassword('short', 'other')).toMatch(/8 đến 100/);
    expect(validateNewPassword('', '')).toMatch(/nhập mật khẩu/);
  });

  test('confirmation is compared exactly (case and spaces matter)', () => {
    expect(validateNewPassword('password123', 'Password123')).toMatch(/không khớp/);
    expect(validateNewPassword('password123', 'password123 ')).toMatch(/không khớp/);
  });
});
