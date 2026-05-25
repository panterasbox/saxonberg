/* alley7 */

#define WEST   "room020"
#define SOUTH  "alley6"

#define DAY_LIGHT   5
#define NIGHT_LIGHT 1

#define SHORT       "Dark Alley"
#define DAY_LONG\
    "You stand in a narrow alley that winds its way between the tall buildings\n" +\
    "around you.  The smell of vomit lies heavily in this bend, where the alley\n" +\
    "leads off in the south and west directions."

#include "room.c"

#define DRUNK_OBJECT "/zone/null/eternal/monsters/drunk"

extra_reset()
{
    if (!present("drunk"))
        move_object(clone_object(DRUNK_OBJECT), THISO);
}

