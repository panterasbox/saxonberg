inherit "/zone/null/eternal/magic/potioncode";
#include "potionbonus.c"

#define BONUS "str"
#define AMOUNT 5
#define DURATION 15

extra_create()
{
    set_look("green");
    set_id_short("A potion of strength.\n");
    set_value(150);
}

drink()
{
    /* give a potion bonus object to the player, or use the one already there */
    if(potionbonus(THISP,BONUS,AMOUNT,DURATION))
	write("You feel stronger!\n");

}
