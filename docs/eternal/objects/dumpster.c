/* dumpster */
#include "/zone/null/eternal/eternal.h"

inherit ObjectCode;

#define CORPSE_OBJECT  "/obj/races/death/corpse"
#define MONEY_OBJECT   "/obj/money/money"

void extra_reset()
{
    object corpse, money;

    if ((!present("corpse", THISO)) && (!present("money", THISO))) {
        corpse=clone_object(CORPSE_OBJECT);
        money=clone_object(MONEY_OBJECT);
        money->set_money(random(10)+5);
        move_object(money, corpse);
        move_object(corpse, THISO);
    }
}

int can_put_and_get()
{
    return 1;
}

void extra_create()
{
    set("id","dumpster");
    set("short","a rusty dumpster in the corner of the alley");
    set("long",
        "This is your typical ECWM (Eternal City Waste Management) " +
        "dumpster that appears to not have been emptied in a long time.  " +
        "The smell of rotting garbage and other nauseous stenches fills " +
        "the air around it.");
    set("gettable", 0);
    set("droppable", 0);
}
