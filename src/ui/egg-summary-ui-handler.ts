import BattleScene from "../battle-scene";
import { Mode } from "./ui";
import PokemonIconAnimHandler, { PokemonIconAnimMode } from "./pokemon-icon-anim-handler";
import { TextStyle, addTextObject } from "./text";
import MessageUiHandler from "./message-ui-handler";
import { Egg, getEggTierForSpecies } from "../data/egg";
import {Button} from "#enums/buttons";
import { Gender } from "#app/data/gender.js";
import { EggHatchData, EggSummaryPhase } from "#app/egg-hatch-phase.js";
import PokemonInfoContainer from "./pokemon-info-container";
import { getVariantTint } from "#app/data/variant.js";
import * as Utils from "../utils";
import i18next from "#app/plugins/i18n.js";
import { speciesEggMoves } from "#app/data/egg-moves.js";
import { allMoves } from "#app/data/move.js";
import { Type } from "#app/data/type.js";
import { EggTier } from "#app/enums/egg-type.js";
import { Species } from "#app/enums/species.js";

export default class EggSummaryUiHandler extends MessageUiHandler {
  private pokemonListContainer: Phaser.GameObjects.Container;
  private pokemonIconSpritesContainer: Phaser.GameObjects.Container;
  private pokemonIconsContainer: Phaser.GameObjects.Container;
  private eggListMessageBoxContainer: Phaser.GameObjects.Container;
  private eggHatchContainer: Phaser.GameObjects.Container;
  private eggHatchBg: Phaser.GameObjects.Image;

  private currentPokemonSprite: Phaser.GameObjects.Sprite;

  private infoContainer: PokemonInfoContainer;
  private pokemonHatchedIcon : Phaser.GameObjects.Sprite;
  private pokemonNumberText: Phaser.GameObjects.Text;
  private pokemonNameText: Phaser.GameObjects.Text;
  private pokemonEggMovesContainer: Phaser.GameObjects.Container;
  private pokemonEggMoveContainers: Phaser.GameObjects.Container[];
  private pokemonEggMoveBgs: Phaser.GameObjects.NineSlice[];
  private pokemonEggMoveLabels: Phaser.GameObjects.Text[];

  private cursorObj: Phaser.GameObjects.Image;

  private iconAnimHandler: PokemonIconAnimHandler;
  private eggHatchData: EggHatchData[];

  /**
   * Allows subscribers to listen for events
   *
   * Current Events:
   * - {@linkcode EggEventType.EGG_COUNT_CHANGED} {@linkcode EggCountChangedEvent}
   */
  public readonly eventTarget: EventTarget = new EventTarget();

  constructor(scene: BattleScene) {
    super(scene, Mode.EGG_HATCH_SUMMARY);
  }


  setup() {
    const ui = this.getUi();

    this.pokemonListContainer = this.scene.add.container(0, -this.scene.game.canvas.height / 6);
    this.pokemonListContainer.setVisible(false);
    ui.add(this.pokemonListContainer);

    this.eggHatchContainer = this.scene.add.container(0, -this.scene.game.canvas.height / 6);
    this.eggHatchContainer.setVisible(false);
    ui.add(this.eggHatchContainer);
    // this.scene.fieldUI.add(this.eggHatchContainer);

    // const bgColor = this.scene.add.rectangle(0, 0, this.scene.game.canvas.width / 6, this.scene.game.canvas.height / 6, 0x006860);
    // bgColor.setOrigin(0, 0);
    // this.eggListContainer.add(bgColor);
    this.iconAnimHandler = new PokemonIconAnimHandler();
    this.iconAnimHandler.setup(this.scene);

    this.eggHatchBg = this.scene.add.image(0, 0, "egg_summary_bg");
    this.eggHatchBg.setOrigin(0, 0);
    this.eggHatchContainer.add(this.eggHatchBg);

    this.pokemonIconsContainer = this.scene.add.container(115, 9);
    this.pokemonIconSpritesContainer = this.scene.add.container(115, 9);
    this.pokemonListContainer.add(this.pokemonIconsContainer);
    this.pokemonListContainer.add(this.pokemonIconSpritesContainer);

    this.cursorObj = this.scene.add.image(0, 0, "select_cursor");
    this.cursorObj.setOrigin(0, 0);
    this.pokemonListContainer.add(this.cursorObj);

    // this.eggSprite = this.scene.add.sprite(54, 37, "egg");
    // this.eggListContainer.add(this.eggSprite);
    this.currentPokemonSprite = this.scene.add.sprite(54, 80, "pkmn__sub");
    this.currentPokemonSprite.setScale(0.8);
    this.currentPokemonSprite.setPipeline(this.scene.spritePipeline, { tone: [ 0.0, 0.0, 0.0, 0.0 ], ignoreTimeTint: true });
    this.pokemonListContainer.add(this.currentPokemonSprite);

    this.pokemonNumberText = addTextObject(this.scene, 80, 107.5, "0000", TextStyle.SUMMARY, {fontSize: 74});
    this.pokemonNumberText.setOrigin(0, 0);
    this.pokemonListContainer.add(this.pokemonNumberText);

    this.pokemonNameText = addTextObject(this.scene, 7, 107.5, "", TextStyle.SUMMARY, {fontSize: 74});
    this.pokemonNameText.setOrigin(0, 0);
    this.pokemonListContainer.add(this.pokemonNameText);

    this.pokemonHatchedIcon = this.scene.add.sprite(0, 90, "egg_icons");
    this.pokemonHatchedIcon.setOrigin(0.15, 0.2);
    this.pokemonHatchedIcon.setScale(0.8);
    this.pokemonListContainer.add(this.pokemonHatchedIcon);

    // TODO remove?
    this.eggListMessageBoxContainer = this.scene.add.container(0, this.scene.game.canvas.height / 6);
    this.eggListMessageBoxContainer.setVisible(false);
    this.pokemonListContainer.add(this.eggListMessageBoxContainer);

    // TODO clean up info container showing
    this.infoContainer = new PokemonInfoContainer(this.scene, 115, 9);
    this.infoContainer.setup();
    this.infoContainer.changeToEggSummaryLayout();
    this.infoContainer.setVisible(true);
    this.pokemonListContainer.add(this.infoContainer);

    this.pokemonEggMoveContainers = [];
    this.pokemonEggMoveBgs = [];
    this.pokemonEggMoveLabels = [];
    this.pokemonEggMovesContainer = this.scene.add.container(0, 200);
    this.pokemonEggMovesContainer.setVisible(false);
    this.pokemonEggMovesContainer.setScale(0.5);

    const eggMovesLabel = addTextObject(this.scene, 70, 0, i18next.t("starterSelectUiHandler:eggMoves"), TextStyle.WINDOW_ALT);
    eggMovesLabel.setOrigin(0.5, 0);

    this.pokemonEggMovesContainer.add(eggMovesLabel);

    for (let m = 0; m < 4; m++) {
      const eggMoveContainer = this.scene.add.container(0, 16 + 5.25 * m);

      const eggMoveBg = this.scene.add.nineslice(70, 0, "type_bgs", "unknown", 92, 14, 2, 2, 2, 2);
      eggMoveBg.setOrigin(1, 0);
      eggMoveBg.setZ(3);

      const eggMoveLabel = addTextObject(this.scene, 70 -eggMoveBg.width / 2, 0, "???", TextStyle.PARTY);
      eggMoveLabel.setOrigin(0.5, 0);
      eggMoveLabel.setZ(3);

      this.pokemonEggMoveBgs.push(eggMoveBg);
      this.pokemonEggMoveLabels.push(eggMoveLabel);

      eggMoveContainer.add(eggMoveBg);
      eggMoveContainer.add(eggMoveLabel);
      eggMoveContainer.setScale(0.375);

      this.pokemonEggMoveContainers.push(eggMoveContainer);

      this.pokemonEggMovesContainer.add(eggMoveContainer);
    }

    this.infoContainer.add(this.pokemonEggMoveContainers);

    this.cursor = -1;
  }

  clear() {
    super.clear();
    this.cursor = -1;
    this.pokemonListContainer.setVisible(false);
    this.pokemonIconSpritesContainer.removeAll(true);
    this.pokemonIconsContainer.removeAll(true);
    this.eggHatchBg.setVisible(false);
    this.currentPokemonSprite.setVisible(false);
    this.pokemonEggMovesContainer.setVisible(false);
    this.getUi().hideTooltip();
    console.log("Egg Summary Handler cleared");

  }

  show(args: any[]): boolean {
    /* args[] information
    * args[0] : the list of EggHatchData for each egg/pokemon hatched
    */
    super.show(args);



    if (args.length >= 1) {
      // this.pokemonHatched = args[0];
      this.eggHatchData = args[0].sort(function sortHatchData(a: EggHatchData, b: EggHatchData) {
        const speciesA = a.pokemon.species;
        const speciesB = b.pokemon.species;
        if (getEggTierForSpecies(speciesA) < getEggTierForSpecies(speciesB)) {
          return -1;
        } else if (getEggTierForSpecies(speciesA) > getEggTierForSpecies(speciesB)) {
          return 1;
        } else {
          if (speciesA.speciesId < speciesB.speciesId) {
            return -1;
          } else if (speciesA.speciesId > speciesB.speciesId) {
            return 1;
          } else {
            return 0;
          }
        }
      }

      );
    }
    // this.pokemonHatched = [];

    this.getUi().bringToTop(this.pokemonListContainer);

    this.pokemonListContainer.setVisible(true);
    this.eggHatchContainer.setVisible(true);
    this.pokemonIconsContainer.setVisible(true);
    this.eggHatchBg.setVisible(true);
    this.pokemonEggMovesContainer.setVisible(true);

    this.eggHatchData.forEach( (value: EggHatchData, i: number) => {
      const x = (i % 11) * 18;
      const y = Math.floor(i / 11) * 18;

      const displayPokemon = value.pokemon;

      const bg = this.scene.add.image(x+2, y+5, "passive_bg");
      bg.setOrigin(0, 0);
      bg.setScale(0.75);
      bg.setVisible(true);
      this.pokemonIconsContainer.add(bg);

      // set tint for passive bg
      switch (getEggTierForSpecies(displayPokemon.species)) {
      case EggTier.COMMON:
        bg.setTint(0xabddab);
        break;
      case EggTier.GREAT:
        bg.setTint(0xabafff);
        break;
      case EggTier.ULTRA:
        bg.setTint(0xffffaa);
        break;
      case EggTier.MASTER:
        bg.setTint(0xdfffaf);
        break;
      }

      const icon = this.scene.add.sprite(x-2, y+2, displayPokemon.species.getIconAtlasKey(displayPokemon.formIndex, displayPokemon.shiny, displayPokemon.variant));
      // const icon = this.scene.add.sprite(x - 2, y + 2, "egg_icons");
      icon.setScale(0.5);
      icon.setOrigin(0, 0);
      icon.setFrame(displayPokemon.species.getIconId(displayPokemon.gender === Gender.FEMALE, displayPokemon.formIndex, displayPokemon.shiny, displayPokemon.variant));
      // icon.setFrame(egg.getKey());
      this.pokemonIconSpritesContainer.add(icon);
      this.iconAnimHandler.addOrUpdate(icon, PokemonIconAnimMode.NONE);

      // add shiny
      const shiny = this.scene.add.image(x + 12, y + 2, "shiny_star_small");
      shiny.setScale(0.5);
      shiny.setVisible(displayPokemon.shiny);
      shiny.setTint(getVariantTint(displayPokemon.variant));
      this.pokemonIconsContainer.add(shiny);

      const ha = this.scene.add.image(x + 12, y + 7, "ha_capsule");
      ha.setScale(0.5);
      ha.setVisible((displayPokemon.hasAbility(displayPokemon.species.abilityHidden)));
      this.pokemonIconsContainer.add(ha);

      const pb = this.scene.add.image(x + 12, y + 14, "icon_owned");
      pb.setOrigin(0, 0);
      pb.setScale(0.5);
      const dexEntry = value.prevDexEntry;
      const caughtAttr = dexEntry.caughtAttr;
      pb.setVisible(!caughtAttr);
      if (!caughtAttr) {
        this.iconAnimHandler.addOrUpdate(icon, PokemonIconAnimMode.PASSIVE);
      }
      this.pokemonIconsContainer.add(pb);

      const em = this.scene.add.image(x, y + 2, "icon_egg_move");
      em.setOrigin(0, 0);
      em.setScale(0.5);
      em.setVisible(value.eggMoveUnlocked);
      this.pokemonIconsContainer.add(em);
    });
    // console.log("generating icons...");
    // this.shinyIcons = new Array(this.eggHatchData.length).fill(null).map((_, i) => {
    //   const x = (i % 11) * 18;
    //   const y = Math.floor(i / 11) * 18;
    //   const ret = this.scene.add.image(x + 12, y + 2, "shiny_star_small");
    //   ret.setOrigin(0, 0);
    //   ret.setScale(0.5);
    //   ret.setVisible(false);
    //   this.pokemonIconsContainer.add(ret);
    //   return ret;
    // });

    // this.hiddenAbilityIcons = new Array(this.eggHatchData.length).fill(null).map((_, i) => {
    //   const x = (i % 11) * 18;
    //   const y = Math.floor(i / 11) * 18;
    //   const ret = this.scene.add.image(x + 12, y + 7, "ha_capsule");
    //   ret.setOrigin(0, 0);
    //   ret.setScale(0.5);
    //   ret.setVisible(false);
    //   this.pokemonIconsContainer.add(ret);
    //   return ret;
    // });

    // this.pokeballIcons = new Array(this.eggHatchData.length).fill(null).map((_, i) => {
    //   const x = (i % 11) * 18;
    //   const y = Math.floor(i / 11) * 18;
    //   const ret = this.scene.add.image(x + 12, y + 14, "icon_owned");
    //   ret.setOrigin(0, 0);
    //   ret.setScale(0.5);
    //   ret.setVisible(false);
    //   this.pokemonIconsContainer.add(ret);
    //   return ret;
    // });

    // this.eggMoveIcons = new Array(this.eggHatchData.length).fill(null).map((_, i) => {
    //   const x = (i % 11) * 18;
    //   const y = Math.floor(i / 11) * 18;
    //   const ret = this.scene.add.image(x, y + 2, "icon_egg_move");
    //   ret.setOrigin(0, 0);
    //   ret.setScale(0.5);
    //   ret.setVisible(false);
    //   this.pokemonIconsContainer.add(ret);
    //   return ret;
    // });
    // console.log("icons done");

    // console.log("generating info containers...");

    // // setup single info container

    // // this.infoContainers = new Array(this.pokemonHatched.length).fill(null).map((_, i) => {
    // //   const ret = new PokemonInfoContainer(this.scene, 45, 100);
    // //   ret.setup();
    // //   ret.show(this.pokemonHatched[i]);
    // //   ret.setVisible(false);
    // //   ret.setScale(0.8);
    // //   this.eggListPokemonContainer.add(ret);
    // //   return ret;
    // // });



    // // TODO sort by number / egg type
    // // TODO add egg hatch count in bottom right
    // let i = 0;
    // for (const hatchData of this.eggHatchData) {
    //   console.log(hatchData);
    //   const displayPokemon = hatchData.pokemon;

    //   // const x = (index % 9) * 18;
    //   // const y = Math.floor(index / 9) * 18;
    //   const x = (i % 11) * 18;
    //   const y = Math.floor(i / 11) * 18;
    //   const icon = this.scene.add.sprite(x-2, y+2, displayPokemon.species.getIconAtlasKey(displayPokemon.formIndex, displayPokemon.shiny, displayPokemon.variant));
    //   // const icon = this.scene.add.sprite(x - 2, y + 2, "egg_icons");
    //   icon.setScale(0.5);
    //   icon.setOrigin(0, 0);
    //   icon.setOrigin(0, 0);
    //   icon.setFrame(displayPokemon.species.getIconId(displayPokemon.gender === Gender.FEMALE, displayPokemon.formIndex, displayPokemon.shiny, displayPokemon.variant));
    //   // icon.setFrame(egg.getKey());
    //   this.pokemonIconSpritesContainer.add(icon);
    //   this.iconAnimHandler.addOrUpdate(icon, PokemonIconAnimMode.NONE);

    //   // this.checkIconId(icon, displayPokemon.species, displayPokemon.female, displayPokemon.formIndex, displayPokemon.shiny, displayPokemon.variant);

    //   // DONE shiny icon funcitonality for variants
    //   // TODO test shiny icons
    //   this.shinyIcons[i].setVisible(displayPokemon.shiny);
    //   this.shinyIcons[i].setTint(getVariantTint(displayPokemon.variant));
    //   // this.shinyIcons[i].setTint(getVariantTint(speciesVariants[v] === DexAttr.DEFAULT_VARIANT ? 0 : speciesVariants[v] === DexAttr.VARIANT_2 ? 1 : 2));
    //   // DONE new pokemon / catch icon functionality
    //   // TODO test for new pokemon
    //   const dexEntry = hatchData.prevDexEntry;
    //   const caughtAttr = dexEntry.caughtAttr;
    //   this.pokeballIcons[i].setVisible(!caughtAttr);
    //   // this.pokeballIcons[i].setVisible(this.scene.gameData.dexData[displayPokemon.species.speciesId].caughtAttr)


    //   this.hiddenAbilityIcons[i].setVisible((displayPokemon.hasAbility(displayPokemon.species.abilityHidden)));

    //   this.eggMoveIcons[i].setVisible(hatchData.eggMoveUnlocked);

    //   console.log(displayPokemon);
    //   console.log(displayPokemon.shiny);
    //   console.log(caughtAttr);
    //   console.log(hatchData.eggMoveUnlocked);
    //   // this.pokeballIcons[i].setVisible(true);
    //   // this.shinyIcons[i].setVisible(true);
    //   // this.hiddenAbilityIcons[i].setVisible(true);

    //   i++;
    // }

    this.setCursor(0);

    return true;
  }



  processInput(button: Button): boolean {
    const ui = this.getUi();

    let success = false;
    const error = false;
    console.log("egg handler button " + button);
    if (button === Button.CANCEL) {
      const phase = this.scene.getCurrentPhase();
      if (phase instanceof EggSummaryPhase) {
        phase.end();
      }
      ui.revertMode();
      success = true;
    } else {
      const count = this.eggHatchData.length;
      const rows = Math.ceil(count / 11);
      const row = Math.floor(this.cursor / 11);
      switch (button) {
      case Button.UP:
        if (row) {
          success = this.setCursor(this.cursor - 11);
        }
        break;
      case Button.DOWN:
        if (row < rows - 2 || (row < rows - 1 && this.cursor % 11 <= (count - 1) % 11)) {
          success = this.setCursor(this.cursor + 11);
        }
        break;
      case Button.LEFT:
        if (this.cursor % 11) {
          success = this.setCursor(this.cursor - 1);
        }
        break;
      case Button.RIGHT:
        if (this.cursor % 11 < (row < rows - 1 ? 10 : (count - 1) % 11)) {
          success = this.setCursor(this.cursor + 1);
        }
        break;
      }
    }

    if (success) {
      ui.playSelect();
    } else if (error) {
      ui.playError();
    }

    return success || error;
  }

  setEggDetails(egg: Egg): void {
    // this.eggSprite.setFrame(`egg_${egg.getKey()}`);
    // this.eggNameText.setText(`${i18next.t("egg:egg")} (${egg.getEggDescriptor()})`);
    // this.eggDateText.setText(
    //   new Date(egg.timestamp).toLocaleString(undefined, {
    //     weekday: "short",
    //     year: "numeric",
    //     month: "2-digit",
    //     day: "numeric"
    //   })
    // );
    // this.eggHatchWavesText.setText(egg.getEggHatchWavesMessage());
    // this.eggGachaInfoText.setText(egg.getEggTypeDescriptor(this.scene));
  }

  setCursor(cursor: integer): boolean {
    let changed = false;

    const lastCursor = this.cursor;

    changed = super.setCursor(cursor);

    if (changed) {
      this.cursorObj.setPosition(114 + 18 * (cursor % 11), 10 + 18 * Math.floor(cursor / 11));

      if (lastCursor > -1) {
        this.iconAnimHandler.addOrUpdate(this.pokemonIconSpritesContainer.getAt(lastCursor) as Phaser.GameObjects.Sprite, PokemonIconAnimMode.NONE);
        // this.infoContainers[lastCursor].setVisible(false);
      }
      this.iconAnimHandler.addOrUpdate(this.pokemonIconSpritesContainer.getAt(cursor) as Phaser.GameObjects.Sprite, PokemonIconAnimMode.ACTIVE);
      // this.infoContainers[cursor].setVisible(true);
      this.setEggDetails(this.scene.gameData.eggs[cursor]);


      // TODO pokemon egg moves + new egg move indicator
      // TODO show egg pokemon hatched from
      // load sprite
      // icon.setFrame(displayPokemon.species.getIconId(, displayPokemon.formIndex, displayPokemon.shiny, displayPokemon.variant));
      const displayPokemon = this.eggHatchData[cursor].pokemon;
      const species = displayPokemon.species;
      const female = displayPokemon.gender === Gender.FEMALE;
      const formIndex = displayPokemon.formIndex;
      const shiny = displayPokemon.shiny;
      const variant = displayPokemon.variant;
      this.infoContainer.show(displayPokemon, false, 1, this.eggHatchData[cursor].getDex(), this.eggHatchData[cursor].prevStarterEntry, true);

      species.loadAssets(this.scene, female, formIndex, shiny, variant, true).then(() => {
        // if (assetLoadCancelled.value) {
        //   return;
        // }
        // this.assetLoadCancelled = null;
        // this.speciesLoaded.set(species.speciesId, true);
        // redundant setVisible(true) but makes sure sprite is only visible after being rendered (no substitute visible)
        this.currentPokemonSprite.setVisible(true);
        this.currentPokemonSprite.play(species.getSpriteKey(female, formIndex, shiny, variant));
        this.currentPokemonSprite.setPipelineData("shiny", shiny);
        this.currentPokemonSprite.setPipelineData("variant", variant);
        this.currentPokemonSprite.setPipelineData("spriteKey", species.getSpriteKey(female, formIndex, shiny, variant));
        // this.pokemonSprite.setVisible(!this.statsMode);
      });
      // TODO pokemon name and number

      this.pokemonNumberText.setText(Utils.padInt(species.speciesId, 4));
      this.pokemonNameText.setText(species.name);

      // TODO show egg moves
      const hasEggMoves = species && speciesEggMoves.hasOwnProperty(species.speciesId);

      for (let em = 0; em < 4; em++) {
        const eggMove = hasEggMoves ? allMoves[speciesEggMoves[species.speciesId][em]] : null;
        const eggMoveUnlocked = eggMove && this.scene.gameData.starterData[species.speciesId].eggMoves & Math.pow(2, em);
        this.pokemonEggMoveBgs[em].setFrame(Type[eggMove ? eggMove.type : Type.UNKNOWN].toString().toLowerCase());
        this.pokemonEggMoveLabels[em].setText(eggMove && eggMoveUnlocked ? eggMove.name : "???");
      }

      // will always have at least one egg move
      this.pokemonEggMovesContainer.setVisible(true);

      // TODO show egg tier / icon
      if (species.speciesId === Species.MANAPHY || species.speciesId === Species.PHIONE) {
        this.pokemonHatchedIcon.setFrame("manaphy");
      } else {
        this.pokemonHatchedIcon.setFrame(getEggTierForSpecies(species));
      }
    }

    return changed;
  }

}
