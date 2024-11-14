# The best solution for the final assignment on ton_dev~study()

In the third cohort of ton_dev~study(), my code was recognized as the best solution for the final assignment. This is confirmed by the fact that this code was used to mint the training completion certificates: https://tonviewer.com/EQDgW5H1damYwXqKmsgA6lvdP-4bGDL_Itt0DlGOvDw6UgUu?section=code

Additionally, by a twist of fate, my training results turned out to be the best among all students: https://getgems.io/collection/EQA0WXDCJicpsFLu2DwxHktxffC04-B_PGRDGmCcfWKjXSzq/EQDgW5H1damYwXqKmsgA6lvdP-4bGDL_Itt0DlGOvDw6UgUu

## Project structure

-   `contracts` - source code of all the smart contracts of the project and their dependencies.
-   `wrappers` - wrapper classes (implementing `Contract` from ton-core) for the contracts, including any [de]serialization primitives and compilation functions.
-   `tests` - tests for the contracts.
-   `scripts` - scripts used by the project, mainly the deployment scripts.

## How to use

### Build

`npx blueprint build` or `yarn blueprint build`

### Test

`npx blueprint test` or `yarn blueprint test`

### Deploy or run another script

`npx blueprint run` or `yarn blueprint run`

### Add a new contract

`npx blueprint create ContractName` or `yarn blueprint create ContractName`
