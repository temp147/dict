import { setTimeout } from 'timers/promises';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { useEnv } from '../../env.js';
import { useLogger } from '../../logger.js';
import type { TelemetryReport } from '../types/report.js';
import { getRandomWaitTime } from '../utils/get-random-wait-time.js';
import { getReport } from './get-report.js';
import { sendReport } from './send-report.js';
import { track } from './track.js';

vi.mock('./get-report.js');
vi.mock('./send-report.js');
vi.mock('timers/promises');
vi.mock('../utils/get-random-wait-time.js');
vi.mock('../../logger.js');

// This is required because logger uses global env which is imported before the tests run. Can be
// reduce to just mock the file when logger is also using useLogger everywhere @TODO
vi.mock('../../env.js', () => ({ useEnv: vi.fn().mockReturnValue({}) }));

let mockLogger: any;

beforeEach(() => {
	mockLogger = { error: vi.fn() };

	vi.mocked(useLogger).mockReturnValue(mockLogger as any);

	vi.mocked(useEnv).mockReturnValue({
		NODE_ENV: 'test',
	});
});

afterEach(() => {
	vi.clearAllMocks();
});

test('Generates and sends report', async () => {
	const mockReport = {} as TelemetryReport;
	vi.mocked(getReport).mockResolvedValue(mockReport);

	const res = await track();

	expect(getReport).toHaveBeenCalledOnce();
	expect(sendReport).toHaveBeenCalledWith(mockReport);
	expect(res).toBe(true);
});

test('Waits a random amount of time if wait option is true', async () => {
	vi.mocked(getRandomWaitTime).mockReturnValue(15);
	await track();
	expect(setTimeout).toHaveBeenCalledWith(15);
});

test('Catches errors silently', async () => {
	vi.mocked(sendReport).mockRejectedValue(false);
	const res = await track();
	expect(res).toBe(false);
});

test('Logs errors as error when node env is development', async () => {
	vi.mocked(useEnv).mockReturnValue({ NODE_ENV: 'development' });
	const mockError = new Error('test');
	vi.mocked(sendReport).mockRejectedValue(mockError);

	await track();

	expect(mockLogger.error).toHaveBeenCalledWith(mockError);
});
