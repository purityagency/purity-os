import { describe, it, expect, vi } from 'vitest';
import { WorkflowRunner } from './WorkflowRunner';
import { WorkflowStep } from './WorkflowStep';

describe('WorkflowRunner', () => {
  it('should execute all steps successfully', async () => {
    const step1: WorkflowStep<Record<string, unknown>> = {
      name: 'step1',
      execute: vi.fn().mockResolvedValue(undefined),
    };
    const step2: WorkflowStep<Record<string, unknown>> = {
      name: 'step2',
      execute: vi.fn().mockResolvedValue(undefined),
    };

    const runner = new WorkflowRunner('TestWorkflow', [step1, step2]);
    const result = await runner.execute({});

    expect(step1.execute).toHaveBeenCalled();
    expect(step2.execute).toHaveBeenCalled();
    expect(result.completed).toEqual(['step1', 'step2']);
    expect(result.failed.length).toBe(0);
  });

  it('should continue executing even if a step fails', async () => {
    const step1: WorkflowStep<Record<string, unknown>> = {
      name: 'step1',
      execute: vi.fn().mockRejectedValue(new Error('Failed step')),
    };
    const step2: WorkflowStep<Record<string, unknown>> = {
      name: 'step2',
      execute: vi.fn().mockResolvedValue(undefined),
    };

    const reporter = vi.fn();
    const runner = new WorkflowRunner('TestWorkflow', [step1, step2], reporter);
    const result = await runner.execute({});

    expect(step1.execute).toHaveBeenCalled();
    expect(step2.execute).toHaveBeenCalled();
    expect(result.completed).toEqual(['step2']);
    expect(result.failed.length).toBe(1);
    expect(result.failed[0].step).toBe('step1');
    expect(reporter).toHaveBeenCalled();
  });
});
