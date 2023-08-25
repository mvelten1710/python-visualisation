import * as assert from 'assert';
import Completer from '../../Completer';
import { describe, it } from 'mocha';


suite('A Completer when', () => {
    describe("waiting for complete", function () {
        it("should complete after specified time", async function () {
            const completer = new Completer();

            setTimeout(() => { completer.complete(""); }, 1500);
            
            await completer.promise;

            assert(true);
        });
    });
});
