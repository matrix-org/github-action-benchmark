import { exec } from '@actions/exec';
import * as core from '@actions/core';
import * as github from '@actions/github';

interface ExecResult {
    stdout: string;
    stderr: string;
    code: number | null;
}

async function capture(cmd: string, args: string[]): Promise<ExecResult> {
    const res: ExecResult = {
        stdout: '',
        stderr: '',
        code: null,
    };

    try {
        const code = await exec(cmd, args, {
            listeners: {
                stdout(data) {
                    res.stdout += data.toString();
                },
                stderr(data) {
                    res.stderr += data.toString();
                },
            },
        });
        res.code = code;
        return res;
    } catch (err) {
        const info = JSON.stringify(res);
        core.debug(`Command '${args}' failed with args ${args.join(' ')}: ${info}`);
        throw err;
    }
}

export async function cmd(...args: string[]): Promise<string> {
    core.debug(`Executing Git: ${args.join(' ')}`);
    const res = await capture('git', args);
    if (res.code !== 0) {
        throw new Error(`Command 'git ${args.join(' ')}' failed: ${res}`);
    }
    return res.stdout;
}

function getRemoteUrl(token: string): string {
    /* eslint-disable @typescript-eslint/camelcase */
    const fullName = github.context.payload.repository?.full_name;
    /* eslint-enable @typescript-eslint/camelcase */

    if (!fullName) {
        throw new Error(`Repository info is not available in payload: ${JSON.stringify(github.context.payload)}`);
    }

    return `https://x-access-token:${token}@github.com/${fullName}.git`;
}

export async function push(token: string, branch: string, ...options: string[]): Promise<string> {
    core.debug(`Executing 'git push' to branch '${branch}' with token and options '${options.join(' ')}'`);

    const remote = getRemoteUrl(token);
    let args = ['push', remote, `${branch}:${branch}`];
    if (options.length > 0) {
        args = args.concat(options);
    }

    return cmd(...args);
}

export async function pull(token: string | undefined, branch: string, ...options: string[]): Promise<string> {
    core.debug(`Executing 'git pull' to branch '${branch}' with token and options '${options.join(' ')}'`);

    const remote = token !== undefined ? getRemoteUrl(token) : 'origin';
    let args = ['pull', remote, branch];
    if (options.length > 0) {
        args = args.concat(options);
    }

    return cmd(...args);
}
