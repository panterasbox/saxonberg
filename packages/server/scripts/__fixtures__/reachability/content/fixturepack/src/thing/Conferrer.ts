/** The Ladder shape: a same-file const, named from both buckets. */
const FIXTURE = [
  "fixture/cmd/fixture/conferred.yaml",
  "fixture/cmd/fixture/both.yaml",
  "fixture/cmd/fixture/phrase.yaml",
  "fixture/cmd/fixture/safe-phrase.yaml",
];
export default class Conferrer {
  static commandContributions = { environment: FIXTURE, peers: FIXTURE };
}
