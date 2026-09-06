import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanMathAndText,
  diceCoefficient,
  evaluateOptionsMatch,
  isBoilerplateStem,
  computeCompositeSimilarity
} from '../src/features/admin/deduplication.utils.js';

describe('TooPrep - Question Deduplication Engine Tests', () => {

  describe('cleanMathAndText', () => {
    it('strips LaTeX delimiters, commands, and markdown images', () => {
      const input = 'In $\\text{reaction}$ ![diagram](http://cdn.com/img.png) where $v = 10\\text{ m/s}$ and $\\alpha = 45^\\circ$.';
      const cleaned = cleanMathAndText(input);
      assert.ok(!cleaned.includes('diagram'));
      assert.ok(!cleaned.includes('http'));
      assert.ok(!cleaned.includes('$'));
      assert.ok(!cleaned.includes('\\'));
      assert.match(cleaned, /reaction/);
      assert.match(cleaned, /10 m s/);
    });

    it('handles unicode mathematical symbols properly', () => {
      const input = 'A \u2212 B \u00D7 C \u2192 D \u03C0';
      const cleaned = cleanMathAndText(input);
      assert.equal(cleaned, 'a - b * c -> d pi');
    });
  });

  describe('diceCoefficient', () => {
    it('returns 1.0 for identical strings', () => {
      const sim = diceCoefficient('the quick brown fox', 'the quick brown fox');
      assert.equal(sim, 1.0);
    });

    it('returns high similarity for minor typos and spacing', () => {
      const sim = diceCoefficient('a circular coil of radius 10 cm', 'a circular coil of radius 10cm');
      assert.ok(sim >= 0.90, 'Expected sim >= 0.90');
    });

    it('returns low similarity for different topics', () => {
      const sim = diceCoefficient('calculate the magnetic field at the center', 'evaluate the integral of sin x dx');
      assert.ok(sim < 0.40, 'Expected sim < 0.40');
    });
  });

  describe('evaluateOptionsMatch', () => {
    it('matches options regardless of permutation / order', () => {
      const opts1 = [
        { id: 'A', text: '$10\\text{ m/s}$' },
        { id: 'B', text: '$20\\text{ m/s}$' },
        { id: 'C', text: '$30\\text{ m/s}$' },
        { id: 'D', text: '$40\\text{ m/s}$' }
      ];
      const opts2 = [
        { id: 'A', text: '$40\\text{ m/s}$' },
        { id: 'B', text: '$10\\text{ m/s}$' },
        { id: 'C', text: '$30\\text{ m/s}$' },
        { id: 'D', text: '$20\\text{ m/s}$' }
      ];
      const match = evaluateOptionsMatch(opts1, opts2);
      assert.equal(match, 1.0);
    });

    it('returns 0 for completely distinct options', () => {
      const opts1 = [{ text: 'Iron' }, { text: 'Copper' }, { text: 'Gold' }, { text: 'Silver' }];
      const opts2 = [{ text: 'Methane' }, { text: 'Ethane' }, { text: 'Propane' }, { text: 'Butane' }];
      const match = evaluateOptionsMatch(opts1, opts2);
      assert.equal(match, 0);
    });
  });

  describe('isBoilerplateStem', () => {
    it('detects common standard JEE introductory phrases', () => {
      assert.ok(isBoilerplateStem('the major product of the following reaction is'));
      assert.ok(isBoilerplateStem('which of the following statements is correct'));
    });

    it('does not classify long specific physics/math problems as boilerplate', () => {
      assert.equal(isBoilerplateStem('a particle of mass m is projected with velocity v at an angle of 30 degrees to the horizontal'), false);
    });
  });

  describe('computeCompositeSimilarity', () => {
    it('classifies exact duplicates with 100% score and EXACT matchType', () => {
      const q1 = {
        id: 'q1',
        question_text: 'A block of mass $m = 2\\text{ kg}$ is placed on a rough horizontal surface with $\\mu = 0.2$. Find friction force.',
        options: [{ text: '4 N' }, { text: '8 N' }, { text: '12 N' }, { text: '16 N' }]
      };
      const q2 = {
        id: 'q2',
        question_text: 'A block of mass m = 2 kg is placed on a rough horizontal surface with \\mu = 0.2. Find friction force.',
        options: [{ text: '4 N' }, { text: '8 N' }, { text: '12 N' }, { text: '16 N' }]
      };
      const result = computeCompositeSimilarity(q1, q2);
      assert.equal(result.matchType, 'EXACT');
      assert.equal(result.score, 100);
      assert.equal(result.isExact, true);
    });

    it('classifies OCR/formatting variations as HIGH_CONFIDENCE', () => {
      const q1 = {
        id: 'q1',
        question_text: 'A body is projected with initial velocity $u = 20\\text{ m/s}$ at an angle $\\theta = 30^\\circ$. The maximum height reached is -',
        options: [{ text: '5 m' }, { text: '10 m' }, { text: '15 m' }, { text: '20 m' }]
      };
      const q2 = {
        id: 'q2',
        question_text: 'A body is projected with initial velocity u = 20 m/s at angle theta = 30 deg. The max height reached is -',
        options: [{ text: '5 m' }, { text: '10 m' }, { text: '15 m' }, { text: '20 m' }]
      };
      const result = computeCompositeSimilarity(q1, q2);
      assert.ok(['EXACT', 'HIGH_CONFIDENCE'].includes(result.matchType));
      assert.ok(result.score >= 88);
    });

    it('rejects boilerplate stems when options are different (no false positive)', () => {
      const q1 = {
        id: 'q1',
        question_text: 'The major product of the following reaction is :',
        options: [{ text: 'Ethanol' }, { text: 'Ethene' }, { text: 'Ethanal' }, { text: 'Ethanoic acid' }]
      };
      const q2 = {
        id: 'q2',
        question_text: 'The major product of the following reaction is :',
        options: [{ text: 'Benzene' }, { text: 'Toluene' }, { text: 'Phenol' }, { text: 'Aniline' }]
      };
      const result = computeCompositeSimilarity(q1, q2);
      assert.equal(result.matchType, null);
    });
  });

  describe('deduplicationService', () => {
    it('provides complete scan summary structure', async () => {
      const { deduplicationService } = await import('../src/features/admin/deduplication.service.js');
      const scanResult = await deduplicationService.scanQuestionBank();
      assert.equal(typeof scanResult.total_scanned, 'number');
      assert.equal(typeof scanResult.total_duplicates_found, 'number');
      assert.equal(typeof scanResult.exact_matches, 'number');
      assert.equal(typeof scanResult.high_confidence, 'number');
      assert.equal(typeof scanResult.potential, 'number');
      assert.ok(Array.isArray(scanResult.pairs));
    });

    it('retrieves flagged duplicates list', async () => {
      const { deduplicationService } = await import('../src/features/admin/deduplication.service.js');
      const list = await deduplicationService.getDuplicates({ status: 'ALL' });
      assert.ok(Array.isArray(list));
    });

    it('rejects resolveDuplicate without delete_id', async () => {
      const { deduplicationService } = await import('../src/features/admin/deduplication.service.js');
      await assert.rejects(
        async () => deduplicationService.resolveDuplicate('test_id', {}),
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.match(err.message, /delete_id is required/);
          return true;
        }
      );
    });

    it('rejects mergeQuestions without target_id or source_id', async () => {
      const { deduplicationService } = await import('../src/features/admin/deduplication.service.js');
      await assert.rejects(
        async () => deduplicationService.mergeQuestions('test_id', { target_id: 't1' }),
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.match(err.message, /Both target_id and source_id are required/);
          return true;
        }
      );
    });
  });
});

