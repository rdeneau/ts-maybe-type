import { Maybe, traverse } from './maybe';

describe('Maybe', () => {
  const content = { id: 123, label: 'any label' };
  type Content = typeof content;

  class Fixture {
    constructor(
      private readonly name: string,
      private readonly createSut: () => Maybe<Content>,
    ) {}

    test(body: (sut: Maybe<Content>) => void): void {
      describe(this.name, () => {
        body(this.createSut());
      });
    }
  }

  const fixtureForSome = new Fixture('some(content)', () => Maybe.some(content));
  const fixtureForNone = new Fixture('none()       ', () => Maybe.none());

  it('should be equatable', function () {
    expect(Maybe.none()).not.toBe(Maybe.none());
    expect(Maybe.none()).toEqual(Maybe.none());

    expect(Maybe.some(1)).not.toEqual(Maybe.some(2));
    expect(Maybe.some(3)).toEqual(Maybe.some(3));
  });

  describe('map()', () => {
    const extractUpperLabel = (x: Content) => x.label.toUpperCase();

    fixtureForSome.test(sut => {
      it(`should map its content`, () => {
        const result = sut.map(extractUpperLabel);
        expect(result).toEqual(Maybe.some(('ANY LABEL')));
      });
    });

    fixtureForNone.test(sut => {
      it(`should map nothing and return itself`, () => {
        const result = sut.map(extractUpperLabel);
        expect(result).toEqual(Maybe.none());
      });
    });
  });

  describe('flatMap()', () => {
    fixtureForSome.test(sut => {
      it(`should return the result of calling 'tryMap' with its content`, () => {
        const tryMap = jasmine.createSpy('tryMap');
        sut.flatMap(tryMap);
        expect(tryMap).toHaveBeenCalledTimes(1);
        expect(tryMap).toHaveBeenCalledWith(content);
      });
    });

    fixtureForNone.test(sut => {
      it(`should map nothing and return itself`, () => {
        const result = sut.flatMap(() => null as any);
        expect(result).toEqual(Maybe.none());
      });
    });
  });

  describe('match()', () => {
    fixtureForSome.test(sut => {
      testMatch(sut, 'some');
    });

    fixtureForNone.test(sut => {
      testMatch(sut, 'none');
    });

    function testMatch(sut: Maybe<Content>, expectedMethodCalled: 'some' | 'none'): void {
      it(`should call '${expectedMethodCalled}'`, () => {
        const some = jasmine.createSpy('some');
        const none = jasmine.createSpy('none');

        sut.match({ some, none });

        expect(some).toHaveBeenCalledTimes(expectedMethodCalled === 'some' ? 1 : 0);
        expect(none).toHaveBeenCalledTimes(expectedMethodCalled === 'none' ? 1 : 0);
      });
    }
  });

  describe('valueOrDefault', () => {
    it(`should return existing content`, () => {
      const input = Maybe.some(1);
      const result = input.valueOrDefault(0);
      expect(result).toBe(1);
    });

    it(`should return given default value when none`, () => {
      const input = Maybe.none<number>();
      const result = input.valueOrDefault(0);
      expect(result).toBe(0);
    });
  });

  describe('valueOrGet', () => {
    it(`should return existing content`, () => {
      const input = Maybe.some(1);
      const getDefaultValue = jest.fn(() => -1);

      const result = input.valueOrGet(getDefaultValue);
      expect(result).toBe(1);
      expect(getDefaultValue).not.toHaveBeenCalled();
    });

    it(`should return given default value when none`, () => {
      const input = Maybe.none<number>();
      const result = input.valueOrGet(() => -1);
      expect(result).toBe(-1);
    });
  });

  describe('fillWhenNone', () => {
    it(`should preserve existing value`, () => {
      const input = Maybe.some(1);
      const result = input.fillWhenNone(0);
      expect(result).toEqual(Maybe.some(1));
    });

    it(`should return given default value given none`, () => {
      const input = Maybe.none<number>();
      const result = input.fillWhenNone(0);
      expect(result).toEqual(Maybe.some(0));
    });
  });

  describe('filter', () => {
    it(`should keep existing value when it satisfies the predicate`, () => {
      const input = Maybe.some(1);
      const result = input.filter(x => x > 0);
      expect(result).toEqual(Maybe.some(1));
    });

    it(`should return none when the existing value does not satisfy the predicate`, () => {
      const input = Maybe.some(1);
      const result = input.filter(x => x < 0);
      expect(result).toEqual(Maybe.none());
    });

    it(`should return none given none`, () => {
      const input = Maybe.none<number>();
      const result = input.filter(() => true);
      expect(result).toEqual(Maybe.none());
    });
  });

  describe('traverse', () => {
    const isEven = (n: number) => n % 2 === 0;
    const isOdd  = (n: number) => n % 2 === 1;

    const tryDoubleOddNumber = (n: number) => isOdd(n)
                                              ? Maybe.some(n * 2)
                                              : Maybe.none<number>();

    const numbers = [0, 1, 2, 3, 4, 5];

    it(`should indicate when no "success" are collected`, () => {
      const result = traverse(numbers.filter(isEven), tryDoubleOddNumber);
      expect(result).toEqual(Maybe.none());
    });

    it(`should collect all "success"`, () => {
      const inputs = numbers.filter(isOdd);
      const expected = inputs.map(n => n * 2);
      const result = traverse(inputs, tryDoubleOddNumber);
      expect(result).toEqual(Maybe.some(expected));
    });

    it('should pass index to the mapping function', () => {
      const result = traverse(['aaa', 'bbb', 'ccc'], (item, index) =>
        index > 0
        ? Maybe.some(item.substring(0, index))
        : Maybe.none<string>());
      expect(result).toEqual(Maybe.some(['b', 'cc']));
    });
  });
});
