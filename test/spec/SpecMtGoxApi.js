describe("getMtGoxApi", function() {
    var embeddableTests = { v1: {}, v2: {}, common: {}, generators: {}};
    var testTimeStamp = 946684800000;
    var FakeDateConstructor = (function FakeDateConstructor() {
        expect(arguments.length).toEqual(0);
        return {getTime: (function () { return testTimeStamp;}), getMicroTime: (function () { return testTimeStamp * 1000;}) };
    });
    var testHmacMessage = undefined;
    var testHmacSecret = undefined;
    var testHmacHash = undefined;
    var FakeJsSha = (function FakeJsSha(srcString, inputFormat, charSize) {
        expect(srcString).toEqual(testHmacMessage);
        expect(inputFormat).toEqual('TEXT');
        expect(charSize).toBeUndefined();
        return {getHMAC: (function getHMAC(secret, inputFormat, variant, outputFormat, outputFormatOpts) {
            expect(secret).toEqual(testHmacSecret);
            expect(inputFormat).toEqual('B64');
            expect(variant).toEqual('SHA-512');
            expect(outputFormat).toEqual('B64');
            expect(outputFormatOpts).toBeUndefined();
            return testHmacHash;
        })};
    });
    var mgApiV1Container = new DependancyInjectionContainer({
        TobliDate: DependancyInjectionContainer.wrap(FakeDateConstructor),
        MtGoxApi: getMtGoxApi,
        MtGoxApiVersion: 1,
        MtGoxAPI2BaseURL: 'https://fake.mtgox.hostname/fake/api/path/',
        JsSha: DependancyInjectionContainer.wrap(FakeJsSha)
    });
    var mgApiV2Container = new DependancyInjectionContainer({
        TobliDate: DependancyInjectionContainer.wrap(FakeDateConstructor),
        MtGoxApi: getMtGoxApi,
        MtGoxApiVersion: 2,
        MtGoxAPI2BaseURL: 'https://fake.mtgox.hostname/fake/api/path/',
        JsSha: DependancyInjectionContainer.wrap(FakeJsSha)
    });

    it("should be a function", function() {
        expect(getMtGoxApi).isAFunction({withName:'getMtGoxApi'});
    });
    it("should return v1 API object", function() {
        expect(mgApiV1Container.get('MtGoxApi')).toBeDefined();
        expect(mgApiV1Container.get('MtGoxApi')).not.toBeNull();
        expect(mgApiV1Container.get('MtGoxApi').constructor).toBeAWellBehavedConstructor({withName:'MtGoxApiV1', returningObjectOfClass: mgApiV1Container.get('MtGoxApi').constructor, withArbitrary: 'parentClass'});
    });
    it("should return v2 API object", function() {
        expect(mgApiV2Container.get('MtGoxApi')).toBeDefined();
        expect(mgApiV2Container.get('MtGoxApi')).not.toBeNull();
        expect(mgApiV2Container.get('MtGoxApi').constructor).toBeAWellBehavedConstructor({withName:'MtGoxApiV2', returningObjectOfClass: mgApiV2Container.get('MtGoxApi').constructor, withArbitrary: 'parentClass'});
    });
    it("should require valid params", function() {
        expect(getMtGoxApi).toThrow("Unrecognized API version: [undefined]");
        expect((function () {getMtGoxApi(DependancyInjectionContainer.wrap(0.5));})).toThrow("Unrecognized API version: 0.5");
    });

    it("should return API object supporting getAccountBalancePath() method", function() {
        expect(mgApiV1Container.get('MtGoxApi').getAccountBalancePath).isAFunction({withName:'getAccountBalancePath'});
        expect(mgApiV1Container.get('MtGoxApi').getAccountBalancePath({currency:'USD'})).toEqual("info.php");
        expect(mgApiV1Container.get('MtGoxApi').getAccountBalancePath({currency:'Simolions'})).toEqual("info.php");
        expect(mgApiV2Container.get('MtGoxApi').getAccountBalancePath).isAFunction({withName:'getAccountBalancePath'});
        expect(mgApiV2Container.get('MtGoxApi').getAccountBalancePath({currency:'USD'})).toEqual("BTCUSD/money/info");
        expect(mgApiV2Container.get('MtGoxApi').getAccountBalancePath({currency:'Simolions'})).toEqual("BTCSimolions/money/info");
    });

    it("should return API object supporting getResponseData() method", function() {
        expect(mgApiV1Container.get('MtGoxApi').getResponseData).isAFunction({withName:'getResponseData'});
        expect(mgApiV1Container.get('MtGoxApi').getResponseData('"My Dog Has Fleas"')).toEqual("My Dog Has Fleas");
        expect(mgApiV2Container.get('MtGoxApi').getResponseData).isAFunction({withName:'getResponseData'});
        expect(mgApiV2Container.get('MtGoxApi').getResponseData('{"data":"My Dog Has Fleas"}')).toEqual("My Dog Has Fleas");
    });

    embeddableTests.generators.UncachablePostUrl = (function (container, getBasePath) {
        return (function testUncachablePostUrl(testCallback, testData) {
            jasmine.iterateOverTestDataSets([
                    {name: 'paths', data: ['info.php', 'BTCSimolions/money/info']},
                    {name: 'v2BaseUrls', data: ['https://data.mtgox.com/api/2/', 'https://fake.mtgox.hostname/fake/api/path/']},
                    {name: 'dateStamps', data: [946684800000, 946684800333]}],
                testData,
                (function (path, v2BaseUrl, dateStamp) {
                    container.set('MtGoxAPI2BaseURL', v2BaseUrl);
                    testTimeStamp = dateStamp;
                    testCallback(path, v2BaseUrl, dateStamp, (getBasePath(v2BaseUrl)  + path + '?t=' + dateStamp.toString()));
                })
            );
        });
    });

    embeddableTests.v1.UncachablePostUrl = embeddableTests.generators.UncachablePostUrl(mgApiV1Container, function (v2BaseUrl) { return 'https://mtgox.com/api/0/'; });
    embeddableTests.v2.UncachablePostUrl = embeddableTests.generators.UncachablePostUrl(mgApiV2Container, function (v2BaseUrl) { return v2BaseUrl; });

    it("should return API object supporting getUncachablePostUrl() method", function() {
        var v1RunCount = 0;
        var v2RunCount = 0;
        embeddableTests.v1.UncachablePostUrl( function (path, baseUrl, dateStamp, expectedResult) {
            v1RunCount++;
            expect(mgApiV1Container.get('MtGoxApi').getUncachablePostUrl(path)).toEqual(expectedResult);
        });
        embeddableTests.v2.UncachablePostUrl( function (path, baseUrl, dateStamp, expectedResult) {
            v2RunCount++;
            expect(mgApiV2Container.get('MtGoxApi').getUncachablePostUrl(path)).toEqual(expectedResult);
        });
        expect(v1RunCount).toEqual(8);
        expect(v2RunCount).toEqual(8);
    });

    embeddableTests.generators.HmacComputation = (function (getComposedMessage) {
        return (function testHmacComputation(testCallback, testData) {
            jasmine.iterateOverTestDataSets([
                    {name: 'paths', data: ['foo', 'bar']},
                    {name: 'dataSets', data: ['BIG DATA', 'little data']},
                    {name: 'secrets', data: ['STRONG SECRET', 'weak secret']},
                    {name: 'testHashes', data: ['hash1', 'hash2']}],
                testData,
                (function (path, dataSet, secret, testHash) {
                    testHmacMessage = getComposedMessage(path, dataSet);
                    testHmacSecret = secret;
                    testHmacHash = testHash;
                    testCallback(path, dataSet, secret, testHash);
                })
            );
        });
    });

    embeddableTests.v1.HmacComputation = embeddableTests.generators.HmacComputation(function (path, data) { return data; });
    embeddableTests.v2.HmacComputation = embeddableTests.generators.HmacComputation(function (path, data) { return path + '\0' + data; });

    it("should return API object supporting computeMessageHmac() method", function() {
        var v1RunCount = 0;
        var v2RunCount = 0;
        expect(mgApiV1Container.get('MtGoxApi').computeMessageHmac).isAFunction({withName:'computeMessageHmac'});
        expect(mgApiV2Container.get('MtGoxApi').computeMessageHmac).isAFunction({withName:'computeMessageHmac'});
        embeddableTests.v1.HmacComputation(function (path, dataSet, secret, expectedResult) {
            v1RunCount++
            expect(mgApiV1Container.get('MtGoxApi').computeMessageHmac(path, dataSet, secret)).toEqual(expectedResult);
        });
        embeddableTests.v2.HmacComputation(function (path, dataSet, secret, expectedResult) {
            v2RunCount++
            expect(mgApiV2Container.get('MtGoxApi').computeMessageHmac(path, dataSet, secret)).toEqual(expectedResult);
        });
        expect(v1RunCount).toEqual(16);
        expect(v2RunCount).toEqual(16);
    });

    it("should return API object supporting addBuyOrder() method", function() {
        var amountPermutations = [
            {
                currency: 'USD',
                amount: 314,
                v1Data: '&Currency=USD&amount=314',
                v2Data: '&type=bid&amount_int=31400000000',
                v2Path: 'BTCUSD/money/order/add'},
            {
                currency: 'USD',
                amount: 42,
                v1Data: '&Currency=USD&amount=42',
                v2Data: '&type=bid&amount_int=4200000000',
                v2Path: 'BTCUSD/money/order/add'},
            {
                currency: 'USD',
                amount: 3.14159,
                v1Data: '&Currency=USD&amount=3.14159',
                v2Data: '&type=bid&amount_int=314159000',
                v2Path: 'BTCUSD/money/order/add'},
            {
                currency: 'Simoleons',
                amount: 314,
                v1Data: '&Currency=Simoleons&amount=314',
                v2Data: '&type=bid&amount_int=31400000000',
                v2Path: 'BTCSimoleons/money/order/add'},
            {
                currency: 'Simoleons',
                amount: 42,
                v1Data: '&Currency=Simoleons&amount=42',
                v2Data: '&type=bid&amount_int=4200000000',
                v2Path: 'BTCSimoleons/money/order/add'},
            {
                currency: 'Simoleons',
                amount: 3.14159,
                v1Data: '&Currency=Simoleons&amount=3.14159',
                v2Data: '&type=bid&amount_int=314159000',
                v2Path: 'BTCSimoleons/money/order/add'}
        ];
        var i;
        var errorCallback, sucessCallback;
        expect(mgApiV1Container.get('MtGoxApi').addBuyOrder).isAFunction({withName:'addOrder'});
        expect(mgApiV2Container.get('MtGoxApi').addBuyOrder).isAFunction({withName:'addOrder'});
        for (i = 0; i < amountPermutations.length; i++ ) {
            embeddableTests.v1.post(
                (function (dataHash) {
                    errorCallback = jasmine.createSpy("error callback");
                    sucessCallback = jasmine.createSpy("success callback");
                    expect(errorCallback).toBe(errorCallback);
                    expect(sucessCallback).toBe(sucessCallback);
                    expect(errorCallback).not.toBe(sucessCallback);
                    expect(dataHash.container.get('MtGoxApi').addBuyOrder(amountPermutations[i].currency, amountPermutations[i].amount, errorCallback, sucessCallback)).not.toBeDefined();
                    expect(errorCallback).not.toHaveBeenCalled();
                    expect(sucessCallback).not.toHaveBeenCalled();
                }),
                (function (eventCallbacks) {
                    expect(eventCallbacks.errorCallback).toBe(errorCallback);
                    expect(eventCallbacks.sucessCallback).toBe(sucessCallback);
                }),
                {
                    paramSets: [{data: ['NOT', 'USED'], string: amountPermutations[i].v1Data}],
                    paths: ['buyBTC.php']
                }
            );
            embeddableTests.v2.post(
                (function (dataHash) {
                    errorCallback = jasmine.createSpy("error callback");
                    sucessCallback = jasmine.createSpy("success callback");
                    expect(errorCallback).toBe(errorCallback);
                    expect(sucessCallback).toBe(sucessCallback);
                    expect(errorCallback).not.toBe(sucessCallback);
                    expect(dataHash.container.get('MtGoxApi').addBuyOrder(amountPermutations[i].currency, amountPermutations[i].amount, errorCallback, sucessCallback)).not.toBeDefined();
                    expect(errorCallback).not.toHaveBeenCalled();
                    expect(sucessCallback).not.toHaveBeenCalled();
                }),
                (function (eventCallbacks) {
                    expect(eventCallbacks.errorCallback).toBe(errorCallback);
                    expect(eventCallbacks.sucessCallback).toBe(sucessCallback);
                }),
                {
                    paramSets: [{data: ['NOT', 'USED'], string: amountPermutations[i].v2Data}],
                    paths: [amountPermutations[i].v2Path]
                }
            );
        }
    });

    it("should return API object supporting addSellOrder() method", function() {
        var amountPermutations = [
            {
                currency: 'USD',
                amount: 314,
                v1Data: '&Currency=USD&amount=314',
                v2Data: '&type=ask&amount_int=31400000000',
                v2Path: 'BTCUSD/money/order/add'},
            {
                currency: 'USD',
                amount: 42,
                v1Data: '&Currency=USD&amount=42',
                v2Data: '&type=ask&amount_int=4200000000',
                v2Path: 'BTCUSD/money/order/add'},
            {
                currency: 'USD',
                amount: 3.14159,
                v1Data: '&Currency=USD&amount=3.14159',
                v2Data: '&type=ask&amount_int=314159000',
                v2Path: 'BTCUSD/money/order/add'},
            {
                currency: 'Simoleons',
                amount: 314,
                v1Data: '&Currency=Simoleons&amount=314',
                v2Data: '&type=ask&amount_int=31400000000',
                v2Path: 'BTCSimoleons/money/order/add'},
            {
                currency: 'Simoleons',
                amount: 42,
                v1Data: '&Currency=Simoleons&amount=42',
                v2Data: '&type=ask&amount_int=4200000000',
                v2Path: 'BTCSimoleons/money/order/add'},
            {
                currency: 'Simoleons',
                amount: 3.14159,
                v1Data: '&Currency=Simoleons&amount=3.14159',
                v2Data: '&type=ask&amount_int=314159000',
                v2Path: 'BTCSimoleons/money/order/add'}
        ];
        var i;
        var errorCallback, sucessCallback;
        expect(mgApiV1Container.get('MtGoxApi').addSellOrder).isAFunction({withName:'addOrder'});
        expect(mgApiV2Container.get('MtGoxApi').addSellOrder).isAFunction({withName:'addOrder'});
        for (i = 0; i < amountPermutations.length; i++ ) {
            embeddableTests.v1.post(
                (function (dataHash) {
                    errorCallback = jasmine.createSpy("error callback");
                    sucessCallback = jasmine.createSpy("success callback");
                    expect(errorCallback).toBe(errorCallback);
                    expect(sucessCallback).toBe(sucessCallback);
                    expect(errorCallback).not.toBe(sucessCallback);
                    expect(dataHash.container.get('MtGoxApi').addSellOrder(amountPermutations[i].currency, amountPermutations[i].amount, errorCallback, sucessCallback)).not.toBeDefined();
                    expect(errorCallback).not.toHaveBeenCalled();
                    expect(sucessCallback).not.toHaveBeenCalled();
                }),
                (function (eventCallbacks) {
                    expect(eventCallbacks.errorCallback).toBe(errorCallback);
                    expect(eventCallbacks.sucessCallback).toBe(sucessCallback);
                }),
                {
                    paramSets: [{data: ['NOT', 'USED'], string: amountPermutations[i].v1Data}],
                    paths: ['sellBTC.php']
                }
            );
            embeddableTests.v2.post(
                (function (dataHash) {
                    errorCallback = jasmine.createSpy("error callback");
                    sucessCallback = jasmine.createSpy("success callback");
                    expect(errorCallback).toBe(errorCallback);
                    expect(sucessCallback).toBe(sucessCallback);
                    expect(errorCallback).not.toBe(sucessCallback);
                    expect(dataHash.container.get('MtGoxApi').addSellOrder(amountPermutations[i].currency, amountPermutations[i].amount, errorCallback, sucessCallback)).not.toBeDefined();
                    expect(errorCallback).not.toHaveBeenCalled();
                    expect(sucessCallback).not.toHaveBeenCalled();
                }),
                (function (eventCallbacks) {
                    expect(eventCallbacks.errorCallback).toBe(errorCallback);
                    expect(eventCallbacks.sucessCallback).toBe(sucessCallback);
                }),
                {
                    paramSets: [{data: ['NOT', 'USED'], string: amountPermutations[i].v2Data}],
                    paths: [amountPermutations[i].v2Path]
                }
            );
        }
    });

    it("should return API object supporting getRequestSamplesUrl() method", function() {
        var testBaseUrls = ['https://data.mtgox.com/api/2/', 'https://fake.mtgox.hostname/fake/api/path/'];
        var testCurrencies = ['USD', 'Simoleons'];
        var testSinceStamps = [946674800000000, 946674800333000];
        var testNowStamps = [946684800000, 946684800333];
        var i,j,k,m,n;
        var fakeSinceDate = {getMicroTime: (function () { return testSinceStamps[k];})};
        expect(mgApiV1Container.get('MtGoxApi').getRequestSamplesUrl).isAFunction({withName:'getRequestSamplesUrl'});
        expect(mgApiV2Container.get('MtGoxApi').getRequestSamplesUrl).isAFunction({withName:'getRequestSamplesUrl'});
        for (i = 0; i < testBaseUrls.length; i++ ) {
            for (j = 0; j < testCurrencies.length; j++ ) {
                for (k = 0; k < testSinceStamps.length; k++ ) {
                    for (m = 0; m < testNowStamps.length; m++ ) {
                        testTimeStamp = testNowStamps[m];
                        mgApiV1Container.set('MtGoxAPI2BaseURL', testBaseUrls[i]);
                        mgApiV2Container.set('MtGoxAPI2BaseURL', testBaseUrls[i]);
                        expect(mgApiV1Container.get('MtGoxApi').getRequestSamplesUrl(testCurrencies[j], fakeSinceDate))
                            .toEqual("https://data.mtgox.com/api/0/data/getTrades.php?Currency=" + testCurrencies[j] + "&since=" + testSinceStamps[k] + "&nonce=" + (testNowStamps[m] * 1000));
                        expect(mgApiV2Container.get('MtGoxApi').getRequestSamplesUrl(testCurrencies[j], fakeSinceDate))
                            .toEqual(testBaseUrls[i] + "BTC" + testCurrencies[j] + "/money/trades/fetch?since=" + testSinceStamps[k] + "&nonce=" + (testNowStamps[m] * 1000));
                    }
                }
            }
        }
    });

    it("should return API object supporting toString() method", function() {
        expect(mgApiV1Container.get('MtGoxApi').toString).isAFunction({withName:'toString'});
        expect(mgApiV1Container.get('MtGoxApi').toString()).toEqual('MtGox API v0');
        expect(mgApiV2Container.get('MtGoxApi').toString).isAFunction({withName:'toString'});
        expect(mgApiV2Container.get('MtGoxApi').toString()).toEqual('MtGox API v2');
    });

    embeddableTests.generators.post = (function (container, hmacTester, urlTester) {
        var defaultParamSets = [
            {  data: [],
                string: ''},
            {  data: ['car=fast'],
                string: '&car=fast'},
            {  data: ['man=Fred', 'woman=Wilma'],
                string: '&man=Fred&woman=Wilma'},
            {  data: ['special=_();[]{}', 'chars=\\\'-!'],
                string: '&special=_();%5B%5D%7B%7D&chars=%5C\'-!'}];
        return (function testPost(testCallback, confirmEventCallbacks, testData) {
            jasmine.iterateOverTestDataSets([
                    {name: 'paramSets', data: defaultParamSets},
                    {name: 'apiKeys', data: ['USER KEY 1', 'user key 2']},
                    {name: 'paths', data: ['info.php', 'BTCSimolions/money/info']},
                    {name: 'v2BaseUrls', data: ['https://data.mtgox.com/api/2/', 'https://fake.mtgox.hostname/fake/api/path/']},
                    {name: 'dateStamps', data: [946684800000, 946684800333]},
                    {name: 'secrets', data: ['STRONG SECRET', 'weak secret']},
                    {name: 'testHashes', data: ['hash1', 'hash2']}],
                testData,
                (function (paramSet, apiKey, inputPath, v2BaseUrl, dateStamp, apiSecret, testHash) {
                    urlTester(function (innerPath, innerV2BaseUrl, innerDateStamp, expectedUrlResult) {
                        hmacTester(function (hmacUrl, hmacDataSet, hmacSecret, expectedHmacResult) {
                            var fakeAjaxRequestConstructor;
                            var fakeRequestHeaders = {};
                            var fakeAjaxRequest = {
                                open: jasmine.createSpy("open request event"),
                                setRequestHeader: (function (key, val) {
                                    expect(arguments.length).toEqual(2);
                                    this.setRequestHeader.callCount++;
                                    expect(this.open.callCount).toEqual(1);
                                    expect(fakeRequestHeaders[key]).not.toBeDefined();
                                    fakeRequestHeaders[key] = val;
                                }),
                                send: (function (data) {
                                    expect(arguments.length).toEqual(1);
                                    expect(data).toBe(hmacDataSet);
                                    this.send.callCount++;
                                    expect(this.open).toHaveBeenCalledWith('POST', expectedUrlResult, true);
                                    expect(this.open.callCount).toEqual(1);
                                    expect(fakeRequestHeaders['Content-Type']).toBe('application/x-www-form-urlencoded');
                                    expect(fakeRequestHeaders['Rest-Key']).toBe(apiKey.toString());
                                    expect(fakeRequestHeaders['Rest-Sign']).toBe(expectedHmacResult.toString());
                                    confirmEventCallbacks({errorCallback: this.onerror, sucessCallback: this.onload});
                                })
                            };
                            fakeAjaxRequest.send.callCount = 0;
                            fakeAjaxRequest.setRequestHeader.callCount = 0;
                            fakeAjaxRequestConstructor = (function () { return fakeAjaxRequest;});
                            container.set('AjaxRequest', DependancyInjectionContainer.wrap(fakeAjaxRequestConstructor));
                            container.get('MtGoxApi').setKey(apiKey);
                            container.get('MtGoxApi').setSecret(hmacSecret);
                            testCallback({
                                container: container,
                                paramSet: paramSet,
                                apiKey: apiKey,
                                inputPath: inputPath,
                                v2BaseUrl: v2BaseUrl,
                                dateStamp: dateStamp,
                                apiSecret: apiSecret,
                                testHash: testHash,
                                expectedUrlResult: expectedUrlResult
                            });
                            expect(fakeAjaxRequest.send.callCount).toEqual(1);
                            expect(fakeAjaxRequest.setRequestHeader.callCount).toEqual(3);
                        }, {
                            paths: [inputPath],
                            dataSets: ['nonce=' + (innerDateStamp*1000).toString() + paramSet.string],
                            secrets: [apiSecret],
                            testHashes: [testHash]
                        });
                    }, {
                        paths: [inputPath],
                        v2BaseUrls: [v2BaseUrl],
                        dateStamps: [dateStamp]
                    });
                })
            );
        });
    });

    embeddableTests.v1.post = embeddableTests.generators.post(mgApiV1Container, embeddableTests.v1.HmacComputation, embeddableTests.v1.UncachablePostUrl);
    embeddableTests.v2.post = embeddableTests.generators.post(mgApiV2Container, embeddableTests.v2.HmacComputation, embeddableTests.v2.UncachablePostUrl);

    it("should return API object supporting post() method", function() {
        expect(mgApiV1Container.get('MtGoxApi').post).toBe(mgApiV2Container.get('MtGoxApi').post);
        var protocolTesters = [ embeddableTests.v1.post, embeddableTests.v2.post ];
        var i;
        for (i = 0; i < protocolTesters.length; i++) {
            var errorCallback, sucessCallback;
            protocolTesters[i](
                (function (dataHash) {
                    errorCallback = jasmine.createSpy("error callback");
                    sucessCallback = jasmine.createSpy("success callback");
                    expect(errorCallback).toBe(errorCallback);
                    expect(sucessCallback).toBe(sucessCallback);
                    expect(errorCallback).not.toBe(sucessCallback);
                    expect(dataHash.container.get('MtGoxApi').post(dataHash.inputPath, dataHash.paramSet.data, errorCallback, sucessCallback)).not.toBeDefined();
                    expect(errorCallback).not.toHaveBeenCalled();
                    expect(sucessCallback).not.toHaveBeenCalled();
                }),
                (function (eventCallbacks) {
                    expect(eventCallbacks.errorCallback).toBe(errorCallback);
                    expect(eventCallbacks.sucessCallback).toBe(sucessCallback);

                })
            );
        }
    });

    embeddableTests.common.accessors = (function accessors(testCallback, testData) {
        jasmine.iterateOverTestDataSets([
                {name: 'keys', data: [{set: false, value: ''}, {set: true, value: 'USER KEY 1'}, {set: true, value: 'user key 2'}]},
                {name: 'secrets', data: ['STRONG SECRET', 'weak secret']}],
            testData,
            (function (keyData, secret) {
                testCallback(keyData.value, secret, keyData.set);
            })
        );
    });

    it("should return API object supporting key and secret accessor methods", function() {
        embeddableTests.common.accessors(function (key, secret, isKeySet) {
            mgApiV1Container.get('MtGoxApi').setKey(key);
            mgApiV1Container.get('MtGoxApi').setSecret(secret);
            expect(mgApiV1Container.get('MtGoxApi').getKey()).toBe(key);
            expect(mgApiV1Container.get('MtGoxApi').getSecret()).toBe(secret);
            expect(mgApiV1Container.get('MtGoxApi').isKeySet()).toBe(isKeySet);
            mgApiV2Container.get('MtGoxApi').setKey(key);
            mgApiV2Container.get('MtGoxApi').setSecret(secret);
            expect(mgApiV2Container.get('MtGoxApi').getKey()).toBe(key);
            expect(mgApiV2Container.get('MtGoxApi').getSecret()).toBe(secret);
            expect(mgApiV2Container.get('MtGoxApi').isKeySet()).toBe(isKeySet);
        });
        expect(mgApiV1Container.get('MtGoxApi').toString).isAFunction({withName:'toString'});
        expect(mgApiV1Container.get('MtGoxApi').toString()).toEqual('MtGox API v0');
        expect(mgApiV2Container.get('MtGoxApi').toString).isAFunction({withName:'toString'});
        expect(mgApiV2Container.get('MtGoxApi').toString()).toEqual('MtGox API v2');
    });
});

