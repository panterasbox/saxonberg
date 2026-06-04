/* mapmach.c */

#define MAP_OBJECT  "/zone/null/eternal/objects/map"

id(str)
{
    return str == "dispenser";
}

short()
{
    return("An Eternal City map dispenser stands here");
}

long()
{
    write(
        "A crude machine constructed from steel and iron.  A small iron bar, which\n" +
        "appears to be some sort of lever protrudes from the right side of the\n" +
        "device.  A small plaque is welded to the front of the machine and has the\n" +
        "following words printed in it: PULL LEVER.\n"
    );
}

init()
{
    add_action("pull_lever", "pull");
}

pull_lever(arg)
{
    if (arg!="lever")
        return(0);
    write(
        "You pull the lever and a small, folded, piece of paper pops out of the\n" +
        "machine and into your waiting hands.\n"
    );
    say(THISP->query_name() + " activates the dispenser.\n");
    move_object(clone_object(MAP_OBJECT), THISP);
    return(1);
}
