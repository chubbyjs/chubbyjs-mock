import { isArgument } from './Argument/ArgumentInterface';
import Call from './Call';

const getMethods = (givenObject: any) => {
    const props: Array<string> = [];

    let object = givenObject;
    do {
        props.push(...Object.getOwnPropertyNames(object));
    } while ((object = Object.getPrototypeOf(object)));

    return props.filter((prop) => typeof givenObject[prop] == 'function');
};

const matchMethod = (expectedMethod: string, givenMethod: string, prefix: string, suffix: string) => {
    if (givenMethod !== expectedMethod) {
        throw new Error(`${prefix} Expected method "${expectedMethod}", given "${givenMethod}" ${suffix}`);
    }
};

const matchArguments = (
    expectedArgs: Array<unknown>,
    givenArgs: Array<unknown>,
    method: string,
    prefix: string,
    suffix: string,
) => {
    if (givenArgs.length !== expectedArgs.length) {
        throw new Error(
            `${prefix} Expected argument count ${expectedArgs.length}, given ${givenArgs.length}, method "${method}" ${suffix}`,
        );
    }

    expectedArgs.forEach((expectedArg: unknown, i) => {
        const givenArg = givenArgs[i];

        if (isArgument(expectedArg)) {
            expectedArg.assert(givenArg);

            return;
        }

        if (givenArg !== expectedArg) {
            throw new Error(
                `${prefix} Expected argument ${JSON.stringify(expectedArg)}, given ${JSON.stringify(
                    givenArg,
                )} at argument ${i}, method "${method}" ${suffix}`,
            );
        }
    });
};

const MockByCalls = <T extends Object>(classDefinition: any, calls: Array<Call>): T => {
    let callIndex = 0;

    const mock = {
        __mockedMethod: (givenMethod: string, givenArgs: Array<unknown>) => {
            const prefix = `Mock "${classDefinition.name}":`;
            const suffix = `at call ${callIndex}`;

            const call = calls[callIndex];

            callIndex++;

            if (!call) {
                throw new Error(`${prefix} Missing defintion ${suffix}`);
            }

            const expectedMethod = call.getMethod();

            matchMethod(expectedMethod, givenMethod, prefix, suffix);

            if (call.hasWith()) {
                const expectedArgs = call.getWith() as Array<unknown>;

                matchArguments(expectedArgs, givenArgs, givenMethod, prefix, suffix);
            }

            const error = call.getError();

            if (error) {
                throw error;
            }

            if (call.hasReturnSelf()) {
                return this;
            }

            if (call.hasReturn()) {
                return call.getReturn();
            }

            if (call.hasReturnCallback()) {
                const callback = call.getReturnCallback() as Function;

                return callback(givenArgs);
            }
        },
    };

    const methods = getMethods(new classDefinition());

    methods.forEach((method: string) => {
        // @ts-expect-error TS7053
        if (mock[method] == undefined) {
            // @ts-expect-error TS7053
            mock[method] = (...args: Array<unknown>): unknown => {
                return mock.__mockedMethod(method, args);
            };
        }
    });

    return (mock as unknown) as T;
};

export default MockByCalls;
