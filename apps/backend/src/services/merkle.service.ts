import CryptoJS from 'crypto-js';

export class MerkleService {
  /**
   * Deterministic stringify by sorting keys (Section 17.2)
   */
  private stableStringify(obj: any): string {
    return JSON.stringify(obj, Object.keys(obj).sort());
  }

  /**
   * Generates a Merkle root from a list of settlement records.
   * Each record: { betId, outcome, payout, close, minPrice, maxPrice }
   */
  generateRoot(leaves: any[]): string {
    if (leaves.length === 0) return '';
    
    // 1. Hash each leaf
    let layer = leaves.map(leaf => {
      return CryptoJS.SHA256(this.stableStringify(leaf)).toString();
    });

    // 2. Iteratively hash pairs until we get the root
    while (layer.length > 1) {
      const nextLayer: string[] = [];
      for (let i = 0; i < layer.length; i += 2) {
        if (i + 1 < layer.length) {
          const a = layer[i];
          const b = layer[i + 1];
          const combined = a < b ? a + b : b + a;
          nextLayer.push(CryptoJS.SHA256(combined).toString());
        } else {
          // If odd number, promote last leaf
          nextLayer.push(layer[i]);
        }
      }
      layer = nextLayer;
    }

    return layer[0];
  }

  /**
   * Generates a Merkle proof for a specific leaf (betId)
   */
  getProof(leaves: any[], targetBetId: string): string[] {
    if (leaves.length === 0) return [];

    // 1. Hash each leaf
    let layer = leaves.map(leaf => ({
      id: leaf.id,
      hash: CryptoJS.SHA256(this.stableStringify(leaf)).toString()
    }));

    const proof: string[] = [];
    let targetIndex = layer.findIndex(l => l.id === targetBetId);
    
    if (targetIndex === -1) return [];

    let currentLayerHashes = layer.map(l => l.hash);

    while (currentLayerHashes.length > 1) {
      const nextLayer: string[] = [];
      for (let i = 0; i < currentLayerHashes.length; i += 2) {
        if (i + 1 < currentLayerHashes.length) {
          const left = currentLayerHashes[i];
          const right = currentLayerHashes[i + 1];
          const combined = left < right ? left + right : right + left;
          nextLayer.push(CryptoJS.SHA256(combined).toString());

          if (i === targetIndex || i + 1 === targetIndex) {
            proof.push(i === targetIndex ? right : left);
            targetIndex = Math.floor(i / 2);
          }
        } else {
          nextLayer.push(currentLayerHashes[i]);
          if (i === targetIndex) {
            targetIndex = Math.floor(i / 2);
          }
        }
      }
      currentLayerHashes = nextLayer;
    }

    return proof;
  }
}
