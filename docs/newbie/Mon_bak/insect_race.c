inherit "/obj/races/bodies/humanoid";
#define HAND_NAME "leg"
#define RACE_SIZE 7
#define BASE_STATS ({ 1, 1, 1, 1, 1, 1 })
#define STAT_MODIFIERS ({ 100, 100, 100, 100, 100, 100 })
#define BASE_SKILLS ({ "dodge", 50 })
#include "/obj/races/std_race.h"

help()
{
}

race_name()
{
return ("insect");
}
