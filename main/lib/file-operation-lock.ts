type ReleaseFunction = () => void;

/**
 * 파일 작업 간 상호 배제를 보장하는 비동기 뮤텍스.
 * file:add, file:delete, file:move, file:sync 등이 동시에 실행되지 않도록 한다.
 */
class FileOperationLock {
    private locked = false;
    private waitQueue: Array<() => void> = [];

    /** 잠금 획득. 이미 잠겨있으면 해제될 때까지 대기한다. */
    async acquire(): Promise<ReleaseFunction> {
        if (!this.locked) {
            this.locked = true;
            return this.createRelease();
        }

        return new Promise<ReleaseFunction>((resolve) => {
            this.waitQueue.push(() => {
                resolve(this.createRelease());
            });
        });
    }

    /** 현재 잠금 상태를 반환한다 (renderer에서 확인용). */
    isLocked(): boolean {
        return this.locked;
    }

    private createRelease(): ReleaseFunction {
        let released = false;
        return () => {
            if (released) return;
            released = true;

            if (this.waitQueue.length > 0) {
                const next = this.waitQueue.shift()!;
                next();
            } else {
                this.locked = false;
            }
        };
    }
}

export const fileOperationLock = new FileOperationLock();
