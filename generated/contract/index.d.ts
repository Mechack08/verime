import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
  derived_secret(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
  birth_year(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
  revoke_key(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
}

export type ImpureCircuits<PS> = {
  issue_proof(context: __compactRuntime.CircuitContext<PS>,
              min_age_0: bigint,
              max_age_0: bigint,
              current_year_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  verify_proof(context: __compactRuntime.CircuitContext<PS>,
               commitment_0: Uint8Array,
               revoke_marker_0: Uint8Array): __compactRuntime.CircuitResults<PS, boolean>;
  revoke(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  issue_proof(context: __compactRuntime.CircuitContext<PS>,
              min_age_0: bigint,
              max_age_0: bigint,
              current_year_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  verify_proof(context: __compactRuntime.CircuitContext<PS>,
               commitment_0: Uint8Array,
               revoke_marker_0: Uint8Array): __compactRuntime.CircuitResults<PS, boolean>;
  revoke(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  issue_proof(context: __compactRuntime.CircuitContext<PS>,
              min_age_0: bigint,
              max_age_0: bigint,
              current_year_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  verify_proof(context: __compactRuntime.CircuitContext<PS>,
               commitment_0: Uint8Array,
               revoke_marker_0: Uint8Array): __compactRuntime.CircuitResults<PS, boolean>;
  revoke(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  proofs: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  revoked: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
