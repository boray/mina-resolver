import {
  Field,
  Struct,
  method,
  state,
  State,
  SmartContract,
  Reducer,
  provable,
  PublicKey,
  Bool,
  Poseidon,
  Provable
} from 'o1js';

/**
 * Basic Example
 * See https://docs.minaprotocol.com/zkapps for more info.
 *
 * The Add contract initializes the state variable 'num' to be a Field(1) value by default when deployed.
 * When the 'update' method is called, the Add contract adds Field(2) to its 'num' contract state.
 *
 * This file is safe to delete and replace with your own contract.
 */


export class Option extends Struct({
  isSome: Bool,
  value: Field,
}) {}

export const KeyValuePair = provable({
  key: Field,
  value: Field,
});

export class StorageContract extends SmartContract {
  reducer = Reducer({
    actionType: KeyValuePair,
  });

  @method async set(key: PublicKey, value: Field) {
    this.reducer.dispatch({ key: Poseidon.hash(key.toFields()), value });
  }

  @method.returns(Option)
  async get(key: PublicKey){
    let pendingActions = this.reducer.getActions({
      fromActionState: Reducer.initialActionState,
    });

    let keyHash = Poseidon.hash(key.toFields());

    let optionValue = this.reducer.reduce(
      pendingActions,
      Option,
      (state, action) => {
        let currentMatch = keyHash.equals(action.key);
        return {
          isSome: currentMatch.or(state.isSome),
          value: Provable.if(currentMatch, action.value, state.value),
        };
      },
      Option.empty(),
      { maxUpdatesWithActions: 5 }
    );

    return optionValue;
  }
}

