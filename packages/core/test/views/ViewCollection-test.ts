/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
import ViewCollection = require('../../lib/views/ViewCollection');

import View = require('../../lib/views/View');

describe('ViewCollection', () => {
  describe('The ViewCollection module', () => {
    it('should be a function', () => {
      ViewCollection.should.be.a('function');
    });

    it('should be a ViewCollection constructor', () => {
      new ViewCollection().should.be.an.instanceof(ViewCollection);
    });
  });

  describe('A ViewCollection instance without views', () => {
    let viewCollection: any;
    before(() => {
      viewCollection = new ViewCollection();
    });

    it('should throw an error when matching a view', () => {
      (function () { viewCollection.matchView('Foo'); })
        .should.throw('No view named Foo found.');
    });
  });

  describe('A ViewCollection instance with one view', () => {
    let viewCollection: any, viewA: any;
    before(() => {
      viewA = new View('MyView1', 'text/html,application/trig;q=0.7');
      viewCollection = new ViewCollection([viewA]);
    });

    it('should throw an error when matching a view with a non-existing type', () => {
      (function () { viewCollection.matchView('Bar'); })
        .should.throw('No view named Bar found.');
    });

    describe('when a client requests HTML', () => {
      let viewDetails: any, request: any, response: any;
      before(() => {
        request = { headers: { accept: 'text/html' } };
        response = {};
        viewDetails = viewCollection.matchView('MyView1', request, response);
      });

      it('should return a match for the view', () => {
        viewDetails.should.have.property('view', viewA);
        viewDetails.should.have.property('type', 'text/html');
        viewDetails.should.have.property('responseType', 'text/html;charset=utf-8');
      });
    });

    describe('when a client requests TriG', () => {
      let viewDetails: any, request: any, response: any;
      before(() => {
        request = { headers: { accept: 'application/trig' } };
        response = {};
        viewDetails = viewCollection.matchView('MyView1', request, response);
      });

      it('should return a match for the view', () => {
        viewDetails.should.have.property('view', viewA);
        viewDetails.should.have.property('type', 'application/trig');
        viewDetails.should.have.property('responseType', 'application/trig;charset=utf-8');
      });
    });
  });

  describe('A ViewCollection instance with three views of two types', () => {
    let viewCollection: any, viewA: any, viewB: any, viewC: any;
    before(() => {
      viewA = new View('MyView1', 'text/html,application/trig;q=0.5');
      viewB = new View('MyView1', 'text/html;q=1.0,application/trig');
      viewC = new View('MyView2', 'text/html');
      viewCollection = new ViewCollection([viewA, viewB, viewC]);
    });

    it('should throw an error when matching a view with a non-existing type', () => {
      (function () { viewCollection.matchView('Bar'); })
        .should.throw('No view named Bar found.');
    });

    describe('when matching a request of one view type as HTML', () => {
      let viewDetails: any, request: any, response: any;
      before(() => {
        request = { headers: { accept: 'text/html' } };
        response = {};
        viewDetails = viewCollection.matchView('MyView1', request, response);
      });

      it('should return a description of the best fitting view', () => {
        viewDetails.should.have.property('view', viewA);
        viewDetails.should.have.property('type', 'text/html');
        viewDetails.should.have.property('responseType', 'text/html;charset=utf-8');
      });
    });

    describe('when matching a request of one view type as TriG', () => {
      let viewDetails: any, request: any, response: any;
      before(() => {
        request = { headers: { accept: 'application/trig' } };
        response = {};
        viewDetails = viewCollection.matchView('MyView1', request, response);
      });

      it('should return a description of the best fitting view', () => {
        viewDetails.should.have.property('view', viewB);
        viewDetails.should.have.property('type', 'application/trig');
        viewDetails.should.have.property('responseType', 'application/trig;charset=utf-8');
      });
    });

    describe('when matching a request of another view type as HTML', () => {
      let viewDetails: any, request: any, response: any;
      before(() => {
        request = { headers: { accept: 'text/html' } };
        response = {};
        viewDetails = viewCollection.matchView('MyView2', request, response);
      });

      it('should return a description of the other view', () => {
        viewDetails.should.have.property('view', viewC);
        viewDetails.should.have.property('type', 'text/html');
        viewDetails.should.have.property('responseType', 'text/html;charset=utf-8');
      });
    });
  });
});
