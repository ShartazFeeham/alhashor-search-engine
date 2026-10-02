import { fireEvent, render, screen } from '@testing-library/react';
import { STORAGE_KEY } from '../lib/compareList';
import { ToastProvider } from '../ui/Toast';
import { CompareProvider, useCompare } from './CompareProvider';

function Probe() {
  const { ids, toggle, add, remove, clear, setAll, has } = useCompare();
  return (
    <div>
      <p aria-label="chosen">{ids.join(',')}</p>
      <span>{has('muslim-5') ? 'has muslim-5' : 'no muslim-5'}</span>
      <button onClick={() => toggle('bukhari-1')}>toggle bukhari-1</button>
      <button onClick={() => toggle('muslim-5')}>toggle muslim-5</button>
      <button onClick={() => add('muslim-5')}>add muslim-5</button>
      <button onClick={() => add('bukhari-63')}>add gap</button>
      <button onClick={() => remove('muslim-5')}>remove muslim-5</button>
      <button onClick={() => toggle('tirmidhi-9')}>toggle tirmidhi-9</button>
      <button onClick={() => toggle('nasai-3')}>toggle nasai-3</button>
      <button onClick={() => toggle('abudawud-7')}>toggle abudawud-7</button>
      <button onClick={clear}>clear</button>
      <button onClick={() => setAll(['nasai-3', 'bukhari-63', 'nasai-3'])}>set all</button>
    </div>
  );
}

const show = () =>
  render(
    <ToastProvider>
      <CompareProvider>
        <Probe />
      </CompareProvider>
    </ToastProvider>
  );
const click = (name) => fireEvent.click(screen.getByRole('button', { name }));
const chosen = () => screen.getByLabelText('chosen').textContent;
const toast = () => screen.getByRole('status').textContent;

beforeEach(() => {
  sessionStorage.clear();
});

test('starts with nothing chosen', () => {
  show();
  expect(chosen()).toBe('');
});

test('toggle adds a hadis, and again removes it, with a toast each time', () => {
  show();
  click('toggle bukhari-1');
  expect(chosen()).toBe('bukhari-1');
  expect(toast()).toBe('তুলনায় যোগ হয়েছে');
  click('toggle bukhari-1');
  expect(chosen()).toBe('');
  expect(toast()).toBe('তুলনা থেকে সরানো হয়েছে');
});

test('the fifth hadis is refused with a message, and the four stay', () => {
  show();
  for (const name of ['toggle bukhari-1', 'toggle muslim-5', 'toggle tirmidhi-9', 'toggle nasai-3']) click(name);
  click('toggle abudawud-7');
  expect(chosen()).toBe('bukhari-1,muslim-5,tirmidhi-9,nasai-3');
  expect(toast()).toBe('সর্বোচ্চ ৪টি হাদীস তুলনা করা যায়');
});

test('add, remove, clear and has', () => {
  show();
  click('add muslim-5');
  expect(screen.getByText('has muslim-5')).toBeInTheDocument();
  click('add muslim-5'); // a repeat changes nothing
  expect(chosen()).toBe('muslim-5');
  click('add gap'); // not a real hadis
  expect(chosen()).toBe('muslim-5');
  click('remove muslim-5');
  expect(screen.getByText('no muslim-5')).toBeInTheDocument();
  click('toggle bukhari-1');
  click('clear');
  expect(chosen()).toBe('');
});

test('setAll replaces the list with the valid ids, quietly', () => {
  show();
  click('toggle bukhari-1');
  click('set all');
  expect(chosen()).toBe('nasai-3');
});

test('the choice is kept for this visit and comes back after a reload', () => {
  const view = show();
  click('toggle bukhari-1');
  click('toggle muslim-5');
  expect(sessionStorage.getItem(STORAGE_KEY)).toBe('bukhari-1,muslim-5');
  view.unmount();
  show();
  expect(chosen()).toBe('bukhari-1,muslim-5');
});

test('clearing is kept too', () => {
  show();
  click('toggle bukhari-1');
  click('clear');
  expect(sessionStorage.getItem(STORAGE_KEY)).toBe('');
});

test('storage that throws does not break choosing', () => {
  const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  show();
  click('toggle bukhari-1');
  expect(chosen()).toBe('bukhari-1');
  get.mockRestore();
  set.mockRestore();
});

test('outside a provider the hook does nothing and never throws', () => {
  render(<Probe />);
  click('toggle bukhari-1');
  expect(chosen()).toBe('');
});
