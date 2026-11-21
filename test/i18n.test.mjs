import assert from 'node:assert/strict';
import test from 'node:test';
import { messagePaths, messages } from '../i18n.js';

test('Hebrew and English expose the same copy paths', () => {
  assert.deepEqual(messagePaths(), pathsOf(messages.en));
});

test('the original Hebrew phase text is unchanged', () => {
  const { sattva, rajas, tamas } = messages.he.phases;
  assert.equal(rajas.heName, 'רג\u05f3אס');
  assert.equal(sattva.description, 'ימי הווסת - התכנסות, רוחניות, חלימה, התמסרות והרפייה');
  assert.deepEqual(sattva.recommendations, [
    'זמן טוב למדיטציה והתבוננות פנימית',
    'מנוחה והתחדשות',
    'הימנעות ממאמץ פיזי מוגזם',
  ]);
  assert.equal(rajas.description, 'ימי טרום הביוץ והביוץ - אנרגטיות, תקשורתיות, חשק מיני, תנועה');
  assert.deepEqual(rajas.recommendations, [
    'זמן מצוין לפגישות ואירועים חברתיים',
    'מתאים לפעילות גופנית אינטנסיבית',
    'תקופה טובה ליוזמות חדשות',
  ]);
  assert.equal(tamas.description, 'ימי טרום הווסת - עייפות, כובד, רגישות בגוף ובנפש, האטה ועיכול');
  assert.deepEqual(tamas.recommendations, [
    'התמקדות במשימות שגרתיות ומוכרות',
    'הקדשת זמן לארגון וסדר',
    'הימנעות מקבלת החלטות משמעותיות',
  ]);
  assert.equal(
    messages.he.learnIntro[0],
    'לפי הפילוסופיה ההודית העתיקה, כל היבט בחיים מושפע משלוש איכויות (גונות) בסיסיות: סאטווה (טוהר והרמוניה), רג׳אס (תנועה ואנרגיה) וטאמאס (כבדות ויציבות).',
  );
  assert.match(messages.he.learnClosing, /להתמודד/);
  assert.match(messages.he.bodyNote, /הקשיבי לגוף שלך/);
  assert.match(messages.he.medicalLine, /אינה ייעוץ רפואי/);
  assert.match(messages.he.medicalLine, /אינה אמצעי מניעה/);
  assert.match(messages.en.medicalLine, /not medical advice/i);
  assert.match(messages.en.medicalLine, /not contraception/i);
});

function pathsOf(value, prefix = '') {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => pathsOf(item, `${prefix}[${index}]`));
  }
  if (value && typeof value === 'object') {
    return Object.keys(value).flatMap((key) => pathsOf(value[key], prefix ? `${prefix}.${key}` : key));
  }
  return [prefix];
}
