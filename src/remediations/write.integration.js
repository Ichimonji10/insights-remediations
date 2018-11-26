'use strict';

const _ = require('lodash');
const { request, reqId, auth } = require('../test');

describe('remediations', function () {
    describe('create', function () {
        test('creates a new remediation', async () => {
            const name = 'remediation';

            const r1 = await request
            .post('/v1/remediations')
            .set(auth.testWrite)
            .send({name})
            .expect(201);

            r1.body.should.have.property('id');
            r1.body.should.have.property('name', name);

            const r2 = await request
            .get(`/v1/remediations/${r1.body.id}`)
            .set(auth.testWrite)
            .expect(200);

            r2.body.should.have.property('id', r1.body.id);
            r2.body.should.have.property('name', name);
        });

        test('400s if unexpected property is provided', async () => {
            const {id, header} = reqId();

            const {body} = await request
            .post('/v1/remediations')
            .set(header)
            .set(auth.testWrite)
            .send({foo: 'bar'})
            .expect(400);

            body.errors.should.eql([{
                id,
                status: 400,
                code: 'OBJECT_ADDITIONAL_PROPERTIES',
                title: 'Additional properties not allowed: foo'
            }]);
        });
    });

    describe('update', function () {
        describe('issue', function () {
            test('resolution', async () => {
                const id = '/v1/remediations/022e01be-74f1-4893-b48c-df429fe7d09f' +
                    '/issues/vulnerabilities:CVE_2017_6074_kernel|KERNEL_CVE_2017_6074';

                await request
                .patch(id)
                .send({
                    resolution: 'selinux_mitigate'
                })
                .set(auth.testWrite)
                .expect(200);

                const {body} = await request
                .get('/v1/remediations/022e01be-74f1-4893-b48c-df429fe7d09f')
                .set(auth.testWrite)
                .expect(200);

                const issue = _.find(body.issues, { id: 'vulnerabilities:CVE_2017_6074_kernel|KERNEL_CVE_2017_6074' });
                issue.resolution.should.have.property('id', 'selinux_mitigate');
            });

            test('400s on unknown resolution id', async () => {
                const {id, header} = reqId();

                const {body} = await request
                .patch('/v1/remediations/022e01be-74f1-4893-b48c-df429fe7d09f/issues/vulnerabilities:CVE-2017-17713')
                .set(header)
                .send({
                    resolution: 'foobar'
                })
                .set(auth.testWrite)
                .expect(400);

                body.errors.should.eql([{
                    id,
                    status: 400,
                    code: 'UNKNOWN_RESOLUTION',
                    title: 'Issue "vulnerabilities:CVE-2017-17713" does not have Ansible resolution "foobar"'
                }]);
            });

            test('400s on unknown issue id', async () => {
                await request
                .patch('/v1/remediations/022e01be-74f1-4893-b48c-df429fe7d09f/issues/vulnerabilities:foo')
                .send({
                    resolution: 'fix'
                })
                .set(auth.testWrite)
                .expect(400);
            });

            test('404s on unknown remediation id', async () => {
                await request
                .patch('/v1/remediations/6b491f9e-70ef-445b-8178-a173dddbbb96/issues/vulnerabilities:CVE-2017-17713')
                .send({
                    resolution: 'fix'
                })
                .set(auth.testWrite)
                .expect(404);
            });
        });
    });

    describe('remove', function () {
        test('remediation', async () => {
            await request
            .delete('/v1/remediations/3d34ed5c-a71f-48ee-b7af-b215f27ae68d')
            .set(auth.testWrite)
            .expect(204);

            await request
            .delete('/v1/remediations/3d34ed5c-a71f-48ee-b7af-b215f27ae68d')
            .set(auth.testWrite)
            .expect(404);
        });

        test('issue', async () => {
            await request
            .delete('/v1/remediations/3274d99f-511d-4b05-9d88-69934f6bb8ec/issues/vulnerabilities:CVE-2017-17713')
            .set(auth.testWrite)
            .expect(204);

            await request
            .delete('/v1/remediations/3274d99f-511d-4b05-9d88-69934f6bb8ec/issues/vulnerabilities:CVE-2017-17713')
            .set(auth.testWrite)
            .expect(404);

            const {body} = await request
            .get('/v1/remediations/3274d99f-511d-4b05-9d88-69934f6bb8ec')
            .set(auth.testWrite)
            .expect(200);

            body.issues.should.have.length(1);
        });

        test('system', async () => {
            const url = '/v1/remediations/869dccf6-19f1-4c2e-9025-e5b8d9e0faef/issues/vulnerabilities:CVE-2017-17713/' +
                'systems/1bada2ce-e379-4e17-9569-8a22e09760af';

            await request
            .delete(url)
            .set(auth.testWrite)
            .expect(204);

            await request
            .delete(url)
            .set(auth.testWrite)
            .expect(404);

            const {body} = await request
            .get('/v1/remediations/869dccf6-19f1-4c2e-9025-e5b8d9e0faef')
            .set(auth.testWrite)
            .expect(200);

            const issue = _.find(body.issues, {id: 'vulnerabilities:CVE-2017-17713'});
            issue.systems.should.have.length(1);
            issue.systems[0].id.should.equal('6749b8cf-1955-42c1-9b48-afc6a0374cd6');
        });
    });
});