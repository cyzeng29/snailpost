import { describe, expect, it } from "vitest";
import { clusterReducer, initialCluster, type ClusterAction, type ClusterState } from "@/components/keepsakes/clusterState";

const run = (s: ClusterState, ...actions: ClusterAction[]) => actions.reduce(clusterReducer, s);

describe("postcard cluster state machine", () => {
  it("goes rest → browse → select → turn → return → browse", () => {
    let s = initialCluster(4);
    s = run(s, { type: "browse" });
    expect(s.mode).toBe("browsing");
    s = run(s, { type: "select", index: 2 });
    expect(s).toMatchObject({ mode: "selected", index: 2, face: "front" });
    s = run(s, { type: "face", face: "back" });
    expect(s).toMatchObject({ mode: "selected", index: 2, face: "back" });
    s = run(s, { type: "return" });
    expect(s.mode).toBe("returning");
    s = run(s, { type: "returned" });
    expect(s).toMatchObject({ mode: "browsing", index: 2, face: "front" });
  });

  it("ignores rapid repeated selections while a card is out or returning", () => {
    let s = run(initialCluster(4), { type: "browse" }, { type: "select", index: 1 });
    s = run(s, { type: "select", index: 3 }, { type: "select", index: 0 });
    expect(s.index).toBe(1);
    s = run(s, { type: "return" }, { type: "select", index: 3 });
    expect(s).toMatchObject({ mode: "returning", index: 1 });
  });

  it("browsing to the next postcard never turns it over", () => {
    let s = run(initialCluster(3), { type: "browse" }, { type: "select", index: 0 }, { type: "face", face: "back" });
    s = run(s, { type: "next" });
    expect(s).toMatchObject({ index: 1, face: "front" });
    s = run(s, { type: "prev" }, { type: "prev" });
    expect(s).toMatchObject({ index: 2, face: "front" });
  });

  it("changing faces never changes the selected postcard", () => {
    let s = run(initialCluster(3), { type: "browse" }, { type: "select", index: 2 });
    for (let i = 0; i < 7; i++) s = run(s, { type: "face", face: i % 2 ? "front" : "back" });
    expect(s.index).toBe(2);
  });

  it("ignores face changes and next/prev when nothing is selected", () => {
    const s = run(initialCluster(3), { type: "browse" }, { type: "face", face: "back" }, { type: "next" });
    expect(s).toMatchObject({ mode: "browsing", face: "front", index: 0 });
  });

  it("recovers from a stale selection when a card is deleted", () => {
    let s = run(initialCluster(3), { type: "browse" }, { type: "select", index: 2 });
    s = run(s, { type: "count", count: 2 });
    expect(s).toMatchObject({ mode: "browsing", index: 1, count: 2 });
    s = run(s, { type: "count", count: 0 });
    expect(s).toMatchObject({ mode: "resting", count: 0 });
  });

  it("ignores out-of-range selections", () => {
    const s = run(initialCluster(2), { type: "browse" }, { type: "select", index: 5 });
    expect(s.mode).toBe("browsing");
  });
});
