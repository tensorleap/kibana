/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';

export default function ({ getService, getPageObjects }) {
  const kibanaServer = getService('kibanaServer');
  const retry = getService('retry');
  const log = getService('log');
  const browser = getService('browser');
  const PageObjects = getPageObjects(['settings']);

  describe('filter scripted fields', function describeIndexTests() {
    before(async function () {
      await browser.setWindowSize(1200, 800);
      await kibanaServer.importExport.load('management');
      // TODO: (Tre') Drop the following line once the documentation is good to go
      // await kibanaServer.importExport.save('management', { types: [ 'index-pattern' ] });
      await kibanaServer.uiSettings.replace({
        defaultIndex: 'f1e4c910-a2e6-11e7-bb30-233be9be6a15',
      });
    });

    after(async function () {
      await kibanaServer.savedObjects.clean({ types: ['search'] });
    });

    const scriptedPainlessFieldName = 'ram_pain1';

    it('should filter scripted fields', async function () {
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaIndexPatterns();
      await PageObjects.settings.clickIndexPatternLogstash();
      await PageObjects.settings.clickScriptedFieldsTab();
      const scriptedFieldLangsBefore = await PageObjects.settings.getScriptedFieldLangs();
      await log.debug('add scripted field');

      // The expression scripted field has been pre-created in the management esArchiver pack since it is no longer
      // possible to create an expression script via the UI
      await PageObjects.settings.addScriptedField(
        scriptedPainlessFieldName,
        'painless',
        'number',
        null,
        '1',
        "doc['machine.ram'].value / (1024 * 1024 * 1024)"
      );

      // confirm two additional scripted fields were created
      await retry.try(async function () {
        const scriptedFieldLangs = await PageObjects.settings.getScriptedFieldLangs();
        expect(scriptedFieldLangs.length).to.be(scriptedFieldLangsBefore.length + 1);
      });

      await PageObjects.settings.setScriptedFieldLanguageFilter('painless');

      await retry.try(async function () {
        const scriptedFieldLangs = await PageObjects.settings.getScriptedFieldLangs();
        expect(scriptedFieldLangs.length).to.be.above(0);
        for (const lang of scriptedFieldLangs) {
          expect(lang).to.be('painless');
        }
      });

      await PageObjects.settings.setScriptedFieldLanguageFilter('expression');

      await retry.try(async function () {
        const scriptedFieldLangs = await PageObjects.settings.getScriptedFieldLangs();
        expect(scriptedFieldLangs.length).to.be.above(0);
        for (const lang of scriptedFieldLangs) {
          expect(lang).to.be('expression');
        }
      });
    });
  });
}
