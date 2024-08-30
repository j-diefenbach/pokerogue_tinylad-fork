import BattleScene from "#app/battle-scene.js";
import { PlayerPokemon } from "#app/field/pokemon.js";
import { DexEntry, StarterDataEntry } from "#app/system/game-data.js";

export class EggHatchData {
  public pokemon: PlayerPokemon;
  public eggMoveIndex: number;
  public eggMoveUnlocked: boolean;
  public dexEntryBeforeUpdate: DexEntry;
  public starterDataEntryBeforeUpdate: StarterDataEntry;
  private scene: BattleScene;

  constructor(scene: BattleScene, pokemon: PlayerPokemon, eggMoveIndex: number) {
    this.scene = scene;
    this.pokemon = pokemon;
    this.eggMoveIndex = eggMoveIndex;
  }

  /**
     * Sets the boolean for if the egg move for the hatch is a new unlock
     * @param unlocked True if the EM is new
     */
  setEggMoveUnlocked(unlocked: boolean) {
    this.eggMoveUnlocked  = unlocked;
  }

  /**
     * Stores a copy of the current DexEntry of the pokemon and StarterDataEntry of its starter
     * Used before updating the dex, so comparing the pokemon to these entries will show the new attributes
     */
  setDex() {
    const currDexEntry = this.scene.gameData.dexData[this.pokemon.species.speciesId];
    const currStarterDataEntry = this.scene.gameData.starterData[this.pokemon.species.getRootSpeciesId()];
    // this.prevDexEntry = this.scene.gameData.dexData[this.pokemon.species.speciesId];
    this.dexEntryBeforeUpdate = {
      seenAttr: currDexEntry.seenAttr,
      caughtAttr: currDexEntry.caughtAttr,
      natureAttr: currDexEntry.natureAttr,
      seenCount: currDexEntry.seenCount,
      caughtCount: currDexEntry.caughtCount,
      hatchedCount: currDexEntry.hatchedCount,
      ivs: [...currDexEntry.ivs]
    };
    this.starterDataEntryBeforeUpdate = {
      moveset: currStarterDataEntry.moveset,
      eggMoves: currStarterDataEntry.eggMoves,
      candyCount: currStarterDataEntry.candyCount,
      friendship: currStarterDataEntry.friendship,
      abilityAttr: currStarterDataEntry.abilityAttr,
      passiveAttr: currStarterDataEntry.passiveAttr,
      valueReduction: currStarterDataEntry.valueReduction,
      classicWinCount: currStarterDataEntry.classicWinCount
    };
  }

  /**
     * Gets the dex entry before update
     * @returns Dex Entry corresponding to this pokemon before the pokemon was added / updated to dex
     */
  getDex(): DexEntry {
    return this.dexEntryBeforeUpdate;
  }

  /**
     * Gets the starter dex entry before update
     * @returns Starter Dex Entry corresponding to this pokemon before the pokemon was added / updated to dex
     */
  getStarterEntry(): StarterDataEntry {
    return this.starterDataEntryBeforeUpdate;
  }

  /**
     * Update the pokedex data corresponding with the new hatch's pokemon data
     * Also sets whether the egg move is a new unlock or not
     * @param showMessage boolean to show messages for the new catches and egg moves (false by default)
     * @returns
     */
  updatePokemon(showMessage : boolean = false) {
    return new Promise<void>(resolve => {
      this.scene.gameData.setPokemonCaught(this.pokemon, true, true, showMessage).then(() => {
        this.scene.gameData.updateSpeciesDexIvs(this.pokemon.species.speciesId, this.pokemon.ivs);
        this.scene.gameData.setEggMoveUnlocked(this.pokemon.species, this.eggMoveIndex, showMessage).then((value) => {
          this.setEggMoveUnlocked(value);
          resolve();
        });
      });
    });
  }
}
