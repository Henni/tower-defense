import Ember from 'ember';

export default Ember.Component.extend({
  classNames: ['td-game__board'],

  mobIndex: 0,

  mobs: Ember.ArrayProxy.create({ content: Ember.A([]) }),

  towers: Ember.ArrayProxy.create({ content: Ember.A([]) }),

  wavePoints: 0,

  _addMobPoints(mobId) {
    let pointsToAdd;
    this.get('mobs').forEach((mob) => {
      if (mobId === mob.get('id')) {
        pointsToAdd = mob.get('points');
      }
    });

    const currentWavePoints = this.get('wavePoints');
    this.set('wavePoints', currentWavePoints + pointsToAdd);
  },

  _generateMob() {
    const mobIndex = this.get('mobIndex');
    const waveMob = this.attrs.waveMobs[mobIndex];
    this.get('mobs').pushObject(waveMob);

    const nextMobIndex = mobIndex + 1;
    this.set('mobIndex', nextMobIndex);
  },

  _mobCapacityReached() {
    return this.get('mobIndex') < this.attrs.waveMobs.length ? false : true;
  },

  _mobInRangeOfTower(mob, tower, range) {
    if (!mob || !tower) {
      return false;
    }

    function getDistance(mob, tower) {
      var latDiff = Math.abs(tower.get('posX') - mob.get('posX'));
      var lngDiff = Math.abs(tower.get('posY') - mob.get('posY'));
      return latDiff + lngDiff;
    }

    return getDistance(mob, tower) < range ? true : false;
  },

  _reduceMobHealth(mobId, healthToReduce) {
    if (!healthToReduce) {
      healthToReduce = 20;
    }

    this.get('mobs').forEach((mob) => {
      if (mobId === mob.get('id')) {
        const currentHealth = mob.get('health');
        mob.set('health', currentHealth - healthToReduce);
      }
    });
  },

  mobFrequency: Ember.computed('mobIndex', function () {
    const mobIndex = this.get('mobIndex');
    const waveMob = this.attrs.waveMobs[mobIndex];
    return waveMob.get('frequency');
  }),

  _applyBackgroundImage: Ember.on('didInsertElement', Ember.observer('attrs.backgroundImage', function () {
    this.$().css('background-image', `url(${this.attrs.backgroundImage})`);
  })),

  _attackMobsInTowerRange: Ember.on('didInsertElement', function () {
    setInterval(() => {
      if (!this.get('towers.length') || !this.get('mobs.length')) {
        return;
      }

      this.get('towers').forEach((tower) => {
        const power = tower.get('attackPower');
        const range = tower.get('attackRange');

        this.get('mobs').forEach((mob) => {
          if (this._mobInRangeOfTower(mob, tower, range)) {
            const mobId = mob.get('id');
            const towerAlreadyHasTarget = !!tower.get('targetedMobId');

            if (!towerAlreadyHasTarget) {
              tower.set('targetedMobId', mobId);
              this._reduceMobHealth(mobId, power);
            } else {
              const mobIsTargetedMob = mobId === tower.get('targetedMobId');

              if (mobIsTargetedMob) {
                const mobAlive = mob.get('health') > 0;
                if (mobAlive) {
                  this._reduceMobHealth(mobId, power);
                } else {
                  tower.set('targetedMobId', null);
                }
              } else {
                const targetedMob = this.get('mobs').find((mob) => {
                  return tower.get('targetedMobId') === mob.get('id');
                });

                const targetedMobInRange = this._mobInRangeOfTower(
                  targetedMob, tower, range
                );
                if (!targetedMobInRange) {
                  tower.set('targetedMobId', mobId);
                  this._reduceMobHealth(mobId, power);
                }
              }
            }
          }
        });
      });
    }, 500);
  }),

  _generateMobs: Ember.observer('attrs.waveStarted', function () {
    this._generateMob();

    if (!this._mobCapacityReached()) {
      const produceNextMob = setInterval(() => {
        this._generateMob();

        if (this._mobCapacityReached()) {
          clearInterval(produceNextMob);
        }
      }, this.get('mobFrequency'));
    }
  }),

  _getTowers: Ember.on('didInsertElement', function () {
    this.attrs.towerGroups.forEach((towerGroup) => {
      towerGroup.get('towers').forEach((tower) => {
        this.get('towers').pushObject(tower);
      });
    });
  }),

  actions: {
    addPoints(points) {
      const currentWavePoints = this.get('wavePoints');
      this.set('wavePoints', currentWavePoints + points);
    },

    subtractPoints(points) {
      const currentWavePoints = this.get('wavePoints');
      this.set('wavePoints', currentWavePoints - points);
    },

    destroyMob(mob) {
      const mobIndex = this.get('mobs').indexOf(mob);

      this.get('mobs').removeAt(mobIndex);
    },

    updateMobClass(mobId, newClass) {
      this.get('mobs').forEach((mob) => {
        if (mobId === mob.get('id')) {
          mob.set('posClass', newClass);
        }
      });
    },

    updateMobPosition(mobId, axis, pos) {
      this.get('mobs').forEach((mob) => {
        if (mobId === mob.get('id')) {
          mob.set('pos' + axis, pos);
        }
      });
    },

    updateTowerPosition(id, axis, pos) {
      axis = axis.toUpperCase();

      this.get('towers').forEach((tower) => {
        if (tower.get('id') === id) {
          tower.set('pos' + axis, pos);
        }
      });
    }
  }
});
