import { describe, expect, it } from 'vitest';
import { getUrl, paramsFromObject } from '../../src/lib/helper';

describe('getUrl', () => {
    it('joins a base url and a path', () => {
        expect(getUrl('/api/app', 'https://hf.example.com')).to.equal(
            'https://hf.example.com/api/app'
        );
    });

    it('strips a single trailing slash from the base url', () => {
        expect(getUrl('/api/app', 'https://hf.example.com/')).to.equal(
            'https://hf.example.com/api/app'
        );
    });

    it('keeps a base url path prefix', () => {
        expect(getUrl('/api/app', 'https://hf.example.com/hf/')).to.equal(
            'https://hf.example.com/hf/api/app'
        );
    });

    it('appends search params when given', () => {
        const params = new URLSearchParams({ format: 'json', limit: '10' });
        expect(
            getUrl('/api/catalogs', 'https://hf.example.com', params)
        ).to.equal('https://hf.example.com/api/catalogs?format=json&limit=10');
    });

    it('omits the query string for empty search params', () => {
        expect(
            getUrl(
                '/api/catalogs',
                'https://hf.example.com',
                new URLSearchParams()
            )
        ).to.equal('https://hf.example.com/api/catalogs');
    });

    it('percent-encodes param values', () => {
        const params = new URLSearchParams({ q: 'a b&c' });
        expect(getUrl('/s', 'https://hf.example.com', params)).to.equal(
            'https://hf.example.com/s?q=a+b%26c'
        );
    });

    it('throws on a base url that is not absolute', () => {
        expect(() => getUrl('/api/app', 'not-a-url')).to.throw();
    });
});

describe('paramsFromObject', () => {
    it('returns empty params for an empty object', () => {
        expect(paramsFromObject({}).toString()).to.equal('');
    });

    it('serialises string and number values', () => {
        expect(
            paramsFromObject({ format: 'json', limit: 10 }).toString()
        ).to.equal('format=json&limit=10');
    });

    it('stringifies boolean values', () => {
        expect(paramsFromObject({ deleted: false }).toString()).to.equal(
            'deleted=false'
        );
    });

    it('serialises an array value as a comma separated string', () => {
        expect(paramsFromObject({ ids: ['a', 'b'] }).toString()).to.equal(
            'ids=a%2Cb'
        );
    });
});
