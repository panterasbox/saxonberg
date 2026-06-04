inherit "/zone/null/eternal/magic/potioncode";
#include "potionbonus.c"

#define BONUS "dex"
#define AMOUNT 5
#define DURATION 30

extra_create()
{
    set_look("thick");
    set_value(150);
}

drink()
{
    /* give a potion bonus object to the player, or use the one already there */
    if(potionbonus(THISP,BONUS,AMOUNT,DURATION))
	write("You feel quick!\n");

}
